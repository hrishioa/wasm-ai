import { WebGPUModel } from "./wasmllm";

/**
 * Two tiers of models:
 *
 *  - **Vintage** (key suffix `-vintage`): the exact URLs this project shipped
 *    with in Nov 2023. Preserved for archaeology — the wasm libraries were
 *    compiled against an old MLC/TVM runtime and are unlikely to load under
 *    `@mlc-ai/web-llm@0.2.82` (current `modelVersion` is `v0_2_80`). See
 *    `resurrection_log.md`.
 *
 *  - **Modern**: entries whose `modelName` matches an id from
 *    `prebuiltAppConfig.model_list` in the current `@mlc-ai/web-llm`. These
 *    are fetched from `mlc-ai/*` on Hugging Face with matching model
 *    libraries, so they actually load on today's Chrome.
 *
 * `openhermes-2.5` is the closest same-era spiritual peer to Dolphin 2.2.1
 * (also a Mistral-7B ChatML fine-tune) and comes straight from `mlc-ai`'s
 * prebuilt list. Good default until we bring Dolphin back properly.
 */
export const SUPPORTED_LOCAL_MODELS: {
  [key: string]: WebGPUModel;
} = {
  "openhermes-2.5": {
    simpleName: "OpenHermes 2.5 (Mistral-7B)",
    modelName: "OpenHermes-2.5-Mistral-7B-q4f16_1-MLC",
    rootUrl:
      "https://huggingface.co/mlc-ai/OpenHermes-2.5-Mistral-7B-q4f16_1-MLC",
  },
  "hermes-3-llama-3.1-8b": {
    simpleName: "Hermes 3 Llama 3.1 8B (modern peer)",
    modelName: "Hermes-3-Llama-3.1-8B-q4f32_1-MLC",
    rootUrl: "https://huggingface.co/mlc-ai/Hermes-3-Llama-3.1-8B-q4f32_1-MLC",
  },
  "mistral-7b-v0.3": {
    simpleName: "Mistral 7B Instruct v0.3",
    modelName: "Mistral-7B-Instruct-v0.3-q4f32_1-MLC",
    rootUrl:
      "https://huggingface.co/mlc-ai/Mistral-7B-Instruct-v0.3-q4f32_1-MLC",
  },
  "hermes-2-pro-mistral-7b": {
    simpleName: "Hermes 2 Pro (Mistral-7B)",
    modelName: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
    rootUrl:
      "https://huggingface.co/mlc-ai/Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",
  },
  "llama-3.2-3b": {
    simpleName: "Llama 3.2 3B Instruct",
    modelName: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    rootUrl: "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f32_1-MLC",
  },
  "smollm2-360m": {
    simpleName: "SmolLM2 360M (tiny, for slow networks)",
    modelName: "SmolLM2-360M-Instruct-q4f32_1-MLC",
    rootUrl: "https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f32_1-MLC",
  },

  // Vintage entries — original URLs from Nov 2023. Keep for archaeology; these
  // will probably fail to load on the current runtime. See resurrection_log.md.
  "dolphin-2.2.1-vintage": {
    simpleName: "Dolphin 2.2.1 (vintage, may not load)",
    modelName: "dolphin-2.2.1-mistral-7b-q4f32_1",
    rootUrl:
      "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1",
    modelParamsUrl:
      "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1/resolve/main/params/",
    wasmUrl:
      "https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1/resolve/main/dolphin-2.2.1-mistral-7b-q4f32_1-webgpu.wasm",
  },
  "openhermes-2.5-vintage": {
    simpleName: "OpenHermes 2.5 (vintage, may not load)",
    modelName: "OpenHermes-2.5-Mistral-7B-q4f32_1",
    rootUrl:
      "https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1",
    modelParamsUrl:
      "https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1/resolve/main/params/",
    wasmUrl:
      "https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1/resolve/main/OpenHermes-2.5-Mistral-7B-q4f32_1-webgpu.wasm",
  },
};
