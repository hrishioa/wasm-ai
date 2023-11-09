import { ChatInterface, ChatModule, ChatWorkerClient } from "@mlc-ai/web-llm";

export type WebGPUModel = {
  modelName: string;
  modelParamsUrl: string;
  rootUrl?: string;
  wasmUrl: string;
  simpleName: string;
};

export class LLMInBrowser {
  private chat: ChatInterface;
  private chatState: "unloaded" | "loading" | "ready" | "streaming" =
    "unloaded";
  private loadingPercent: number = 0;
  private loadingMessage: string = "";
  private latestResponse: string = "";
  private model: WebGPUModel | null = null;

  constructor(
    worker: Worker,
    private readonly loadingMessageCallback?: (message: string) => void,
    private readonly loadingProgressCallback?: (percent: number) => void,
  ) {
    if (worker) {
      this.chat = new ChatWorkerClient(worker);
    } else {
      this.chat = new ChatModule();
    }
  }

  private getModelConfig(model: WebGPUModel) {
    return {
      model_list: [
        {
          model_url: model.modelParamsUrl,
          local_id: model.modelName,
        },
      ],
      model_lib_map: {
        [model.modelName]: model.wasmUrl,
      },
    };
  }

  setLoadingState(report: any) {
    this.loadingMessage = report.text;
    this.loadingPercent = report.progress * 100;
    this.loadingMessageCallback && this.loadingMessageCallback(report.text);
    this.loadingProgressCallback &&
      this.loadingProgressCallback(report.progress * 100);
    if (report.progress >= 1) this.chatState = "ready";
  }

  getState() {
    return {
      chatState: this.chatState,
      loadingPercent: this.loadingPercent,
      loadingMessage: this.loadingMessage,
      latestResponse: this.latestResponse,
    };
  }

  async load(model: WebGPUModel) {
    this.model = model;
    if (this.chatState === "unloaded") {
      console.log(
        "Loading ",
        model.modelName,
        " with config ",
        this.getModelConfig(model),
      );
      this.chat.setInitProgressCallback(this.setLoadingState.bind(this));
      this.chatState = "loading";
      await this.chat.reload(
        this.model.modelName,
        undefined,
        this.getModelConfig(this.model),
      );
      this.chatState = "ready";
    } else {
      console.error("LLM doesnt need to be loaded - state is ", this.chatState);
    }
  }

  async stop() {
    if(this.chatState === "streaming") {
      await this.chat.interruptGenerate();
      this.chatState = "ready";
    }
  }

  async unload(force: boolean = false) {
    if (force || this.chatState === "unloaded" || this.chatState === "ready") {
      await this.chat.unload();
      this.chatState = "unloaded";
      this.loadingPercent = 0;
    } else {
      console.error("Not being forced, and chat state is ", this.chatState);
    }
  }

  async clearHistory() {
    await this.chat.resetChat();
  }

  async ask(
    input: string,
    partialMessageCallback?: (partialMessage: string) => void,
    onFinishCallback?: (fullMessage: string) => void,
    interrupt: boolean = false,
  ) {
    const getResponsetoken = (step: number, message: string) => {
      if (this.chatState === "ready") return;
      if (message.length === 0) {
        this.chat.interruptGenerate();
        this.chatState = "ready";
        onFinishCallback && onFinishCallback(this.latestResponse);
        return;
      }
      this.latestResponse = message;
      if (partialMessageCallback) partialMessageCallback(message);
    };

    if (this.chatState === "streaming" && interrupt) {
      await this.chat.interruptGenerate();
    } else if (this.chatState !== "ready") {
      console.error("Chat is not ready for new ask");
      return;
    }

    this.chatState = "streaming";
    this.latestResponse = "";
    this.chat.generate(input, getResponsetoken.bind(this)).then(() => {
      if (this.chatState !== "ready")
        onFinishCallback && onFinishCallback(this.latestResponse);
      this.chatState = "ready";
    });
  }
}
