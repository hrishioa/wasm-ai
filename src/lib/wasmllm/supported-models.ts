import { WebGPUModel } from './wasmllm';

export const SUPPORTED_LOCAL_MODELS: {
  [key: string]: WebGPUModel;
} = {
  "dolphin-2.2.1": {
    simpleName: "Dolphin 2.2.1",
    modelName: "dolphin-2.2.1-mistral-7b-q4f32_1",
    rootUrl:
      "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1",
    modelParamsUrl:
      "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1/resolve/main/params/",
    wasmUrl:
      "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1/resolve/main/dolphin-2.2.1-mistral-7b-q4f32_1-webgpu.wasm",
  },
  "openhermes-2.5": {
    simpleName: "OpenHermes 2.5",
    modelName: "OpenHermes-2.5-Mistral-7B-q4f32_1",
    rootUrl:
      "https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1",
    modelParamsUrl:
      "https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1/resolve/main/params/",
    wasmUrl:
      "https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1/resolve/main/OpenHermes-2.5-Mistral-7B-q4f32_1-webgpu.wasm",
  },
};