import {
  type AppConfig,
  type ChatCompletionMessageParam,
  type InitProgressReport,
  type MLCEngineInterface,
  MLCEngine,
  WebWorkerMLCEngine,
  deleteChatConfigInCache,
  prebuiltAppConfig,
} from "@mlc-ai/web-llm";

/**
 * Describes one selectable model for the UI.
 *
 * Two shapes are supported:
 *
 *  1. **Prebuilt** — a `modelName` that already exists in
 *     `prebuiltAppConfig.model_list` from `@mlc-ai/web-llm`. `wasmUrl` and
 *     `modelParamsUrl` can be omitted; the library already knows where to
 *     fetch weights and the compatible model library from.
 *
 *  2. **Custom** — explicit `modelParamsUrl` + `wasmUrl`. We build a
 *     `ModelRecord` on the fly and install it via `setAppConfig` before
 *     `reload`. Used for the recompiled Dolphin 2.2.1 and the preserved
 *     vintage entries.
 */
export type WebGPUModel = {
  modelName: string;
  modelParamsUrl?: string;
  rootUrl?: string;
  wasmUrl?: string;
  simpleName: string;
};

type ChatState = "unloaded" | "loading" | "ready" | "streaming";

export class LLMInBrowser {
  private engine: MLCEngineInterface;
  private chatState: ChatState = "unloaded";
  private loadingPercent = 0;
  private loadingMessage = "";
  private latestResponse = "";
  private model: WebGPUModel | null = null;
  private history: ChatCompletionMessageParam[] = [];
  private abortRequested = false;

  constructor(
    worker: Worker | null,
    private readonly loadingMessageCallback?: (message: string) => void,
    private readonly loadingProgressCallback?: (percent: number) => void,
  ) {
    this.engine = worker ? new WebWorkerMLCEngine(worker) : new MLCEngine();
  }

  /**
   * Build an AppConfig that includes both the web-llm prebuilt list *and* any
   * custom model record we need for a "vintage" entry, so the chat can switch
   * between them freely.
   */
  private buildAppConfig(model: WebGPUModel): AppConfig | null {
    if (model.wasmUrl && model.modelParamsUrl) {
      // web-llm's internal `cleanModelUrl` calls `new URL(modelUrl).href`
      // unconditionally and throws on relative URLs, so resolve against the
      // current origin ourselves before handing it over. This lets
      // `modelParamsUrl` be either a fully qualified HF link (what we use in
      // production) or a path under `/public/` for local serving during dev.
      let modelHref = model.modelParamsUrl;
      if (!/^https?:\/\//i.test(modelHref) && typeof self !== "undefined") {
        modelHref = new URL(modelHref, self.location.origin).href;
      }
      return {
        model_list: [
          ...prebuiltAppConfig.model_list,
          {
            model: modelHref,
            model_id: model.modelName,
            model_lib: model.wasmUrl,
          },
        ],
        useIndexedDBCache: prebuiltAppConfig.useIndexedDBCache,
      };
    }
    return null;
  }

  private setLoadingState = (report: InitProgressReport) => {
    this.loadingMessage = report.text;
    this.loadingPercent = Math.round(report.progress * 100);
    this.loadingMessageCallback?.(report.text);
    this.loadingProgressCallback?.(this.loadingPercent);
    if (report.progress >= 1) this.chatState = "ready";
  };

  getState() {
    return {
      chatState: this.chatState,
      loadingPercent: this.loadingPercent,
      loadingMessage: this.loadingMessage,
      latestResponse: this.latestResponse,
    };
  }

  async load(model: WebGPUModel) {
    if (this.chatState !== "unloaded") {
      console.error("LLM doesn't need to be loaded - state is", this.chatState);
      return;
    }
    this.model = model;
    console.log("Loading", model.modelName);

    const customAppConfig = this.buildAppConfig(model);
    if (customAppConfig) {
      this.engine.setAppConfig(customAppConfig);
      // For locally-served ("custom") models we may be iterating on
      // mlc-chat-config.json (e.g. tokenizer_files, stop_token_ids). web-llm
      // caches the config in a separate `webllm/config` store keyed by URL,
      // so without this evict, any edit to the on-disk config is invisible
      // until the user clears site data. The weight cache is untouched.
      try {
        await deleteChatConfigInCache(model.modelName, customAppConfig);
      } catch (err) {
        console.warn("Could not clear cached chat config:", err);
      }
    }
    this.engine.setInitProgressCallback(this.setLoadingState);
    this.chatState = "loading";
    await this.engine.reload(model.modelName);
    this.chatState = "ready";
  }

  async stop() {
    if (this.chatState === "streaming") {
      this.abortRequested = true;
      await this.engine.interruptGenerate();
      this.chatState = "ready";
    }
  }

  async unload(force = false) {
    if (force || this.chatState === "unloaded" || this.chatState === "ready") {
      await this.engine.unload();
      this.chatState = "unloaded";
      this.loadingPercent = 0;
    } else {
      console.error("Not being forced, and chat state is", this.chatState);
    }
  }

  async clearHistory() {
    this.history = [];
    await this.engine.resetChat();
  }

  async ask(
    input: string,
    partialMessageCallback?: (partialMessage: string) => void,
    onFinishCallback?: (fullMessage: string) => void,
    interrupt = false,
  ) {
    if (this.chatState === "streaming" && interrupt) {
      await this.stop();
    } else if (this.chatState !== "ready") {
      console.error("Chat is not ready for new ask");
      return;
    }

    this.chatState = "streaming";
    this.latestResponse = "";
    this.abortRequested = false;
    this.history.push({ role: "user", content: input });

    try {
      const stream = await this.engine.chat.completions.create({
        messages: this.history,
        stream: true,
      });
      for await (const chunk of stream) {
        if (this.abortRequested) break;
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (!delta) continue;
        this.latestResponse += delta;
        partialMessageCallback?.(this.latestResponse);
      }

      this.history.push({
        role: "assistant",
        content: this.latestResponse,
      });
    } catch (err) {
      console.error("Generation failed:", err);
      this.history.pop(); // remove the user turn we never answered
      throw err;
    } finally {
      if (this.chatState !== "ready") this.chatState = "ready";
      onFinishCallback?.(this.latestResponse);
    }
  }
}
