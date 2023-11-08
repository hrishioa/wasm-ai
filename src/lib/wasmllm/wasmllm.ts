import {
  ChatInterface,
  ChatModule,
  ChatWorkerClient,
} from "@mlc-ai/web-llm";

export type WebGPUModel = {
  modelName: string,
  modelParamsUrl: string,
  rootUrl?: string,
  wasmUrl: string,
  simpleName: string
}

export const SUPPORTED_LOCAL_MODELS: {
  [key: string]: WebGPUModel
} = {
  'dolphin-2.2.1-desktop': {
    simpleName: 'Dolphin 2.2.1 (Local)',
    modelName: "dolphin-2.2.1-mistral-7b-q4f32_1",
    modelParamsUrl: "http://192.168.50.177:8081/dolphin-2.2.1-mistral-7b-q4f32_1/params/",
    wasmUrl: "http://192.168.50.177:8081/dolphin-2.2.1-mistral-7b-q4f32_1/dolphin-2.2.1-mistral-7b-q4f32_1-webgpu.wasm"
  },
  'dolphin-2.2.1-hf': {
    simpleName: 'Dolphin 2.2.1',
    modelName: "dolphin-2.2.1-mistral-7b-q4f32_1",
    rootUrl: "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1",
    modelParamsUrl: "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1/resolve/main/params/",
    wasmUrl: "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1/resolve/main/dolphin-2.2.1-mistral-7b-q4f32_1-webgpu.wasm"
  }
}

export class LLMInBrowser {
  private chat: ChatInterface;
  private chatState: 'unloaded' | 'loading' | 'ready' | 'streaming' = 'unloaded';
  private loadingPercent: number = 0;
  private loadingMessage: string = '';
  private latestResponse: string = '';
  private model: WebGPUModel | null = null;

  constructor(worker: Worker, private readonly loadingMessageCallback?: (message: string) => void, private readonly loadingProgressCallback?: (percent: number) => void) {
    if (worker) {
      this.chat = new ChatWorkerClient(
        worker
      );
    } else {
      this.chat = new ChatModule();
    }
  }

  private getModelConfig(model: WebGPUModel) {
    return {
      model_list: [
        {
          model_url: model.modelParamsUrl,
          local_id: model.modelName
        }
      ],
      model_lib_map: {
        [model.modelName]: model.wasmUrl
      },
    }
  }

  setLoadingState(report: any) {
    this.loadingMessage = report.text;
    this.loadingPercent = report.progress*100;
    this.loadingMessageCallback && this.loadingMessageCallback(report.text);
    this.loadingProgressCallback && this.loadingProgressCallback(report.progress*100);
    console.log('Loading progress: ', report.progress, ' message: ', report.text);
    if(report.progress >= 1)
      this.chatState = 'ready';
  }

  getState() {
    return {
      chatState: this.chatState,
      loadingPercent: this.loadingPercent,
      loadingMessage: this.loadingMessage,
      latestResponse: this.latestResponse
    };
  }

  async load(model: WebGPUModel) {
    this.model = model;
    console.log('Loading ', model.modelName, ' with config ', this.getModelConfig(model));
    if (this.chatState === 'unloaded') {
      this.chat.setInitProgressCallback(this.setLoadingState.bind(this));
      this.chatState = 'loading';
      await this.chat.reload(this.model.modelName, undefined, this.getModelConfig(this.model));
      this.chatState = 'ready';
    } else {
      console.error('LLM doesnt need to be loaded - state is ', this.chatState);
    }
  }

  async unload(force: boolean = false) {
    if(force || this.chatState === 'unloaded' || this.chatState === 'ready') {
        await this.chat.unload();
        this.chatState = 'unloaded';
        this.loadingPercent = 0;
    } else {
      console.error('Not being forced, and chat state is ', this.chatState);
    }
  }

  async clearHistory() {
    await this.chat.resetChat();
  }

  async ask(input: string, partialMessageCallback?: (partialMessage: string) => void, onFinishCallback?: (fullMessage: string) => void, interrupt: boolean = false) {
    console.log('Got ask ', input, ' with interrupt ', interrupt, ' and chat state ', this.chatState);

    const getResponsetoken = (step: number, message: string) => {
      if(this.chatState === 'ready')
        return;
      if(message.length === 0) {
        console.log('End of response');
        this.chat.interruptGenerate();
        this.chatState = 'ready';
        onFinishCallback && onFinishCallback(this.latestResponse);
        return;
      }
      console.log('Got response: step ', step, ' message ', message);
      this.latestResponse = message;
      if(partialMessageCallback)
        partialMessageCallback(message);
    }

    if(this.chatState === 'streaming' && interrupt) {
      await this.chat.interruptGenerate();
    } else if(this.chatState !== 'ready') {
      console.error('Chat is not ready for new ask');
      return;
    }

    this.chatState = 'streaming';
    this.latestResponse = '';
    this.chat.generate(input, getResponsetoken.bind(this)).then(() => {
      if(this.chatState !== 'ready')
        onFinishCallback && onFinishCallback(this.latestResponse);
      console.log('Finished generating');
      this.chatState = 'ready';
    });
  }
}