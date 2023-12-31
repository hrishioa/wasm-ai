<h1 align="center">
  WASM AI
</h1>

<h2 align="center">Everything you need to run llms natively in the browser<br> and look good doing it.</h3>

<div align="center">

[![Twitter Follow](https://img.shields.io/twitter/follow/hrishi?style=social)](https://twitter.com/hrishioa)[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

</div>

<p align="center">
  <a target="_blank" href="https://wasmai.vercel.app">Live Demo</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#one-click-deploy">One Click Deploy</a> •
  <a href="#usage">Usage</a> •
</p>

<div align="center">

https://github.com/hrishioa/wasm-ai/assets/973967/1326d279-c376-436a-8258-ad2abdf5e21e

</div>

WASM AI is a quickstart template to run large language models completely in the browser. Modern 7B LLMs (even quantized to q4) are incredibly intelligent - good enough for text-to-SQL search, creative writing, analysis, NLP and other tasks - or to be a friend on an airplane. You can now run them in the browser for complete privacy, at blazing inference speeds, without a cent of cloud costs.

WASM AI puts together work from far more talented people (like the folks at [MLC LLM](https://llm.mlc.ai/), who built the library to compile huggingface models into other formats, and [Vercel](https://vercel.com/), who made [Vercel AI](https://vercel.com/ai) and [the chatbot template](https://vercel.com/templates/next.js/nextjs-ai-chatbot)).

## Key Features

This repo is meant to be a quickstart to build and iterate on local, open-source models in the browser, even distribute them as part of larger apps. We have a few things here that might be useful:

- **Two smart, compiled models**

  - [Dolphin 2.2.1](https://huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1) and [OpenHermes-2.5](https://huggingface.co/hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1) are provided as compiled wasm-compatible models to test. I can compile other models on request, when I get the time.

- **Swap between local and cloud easily**

  - I kept things as compatible as I could with Vercel's AI library, which has useful things like backpressure and streaming. You can swap them [by changing these two constants](https://github.com/hrishioa/wasm-ai/blob/3597ae2652d0d8f2ad059016943c27f20d9c1c6e/src/components/chat.tsx#L19C1-L22C77). That's it. This should make testing and validation easier for your apps.

- **Web workers**

  - took some figuring out, but the local model and inference sits inside a worker, so the UI can run smoother.

- **UI Bells and whistles**

  - live code and markdown formatting, scroll to bottom, etc. I got most of these from the chatbot template, but I've cleaned out everything else and done a fresh migration.

- **Local Transcription with Whisper**

  - In the spirit of doing everything on the browser, [Whisper-turbo](https://github.com/FL33TW00D/whisper-turbo) is now integrated, to do voice chat directly in the browser. If you'd like just the base chat things, pull the `just-chat` branch.

_This repo is the work of one overworked dev, and meant to be for educational purposes. Use at your own risk!_

**For other projects, [check out wishful search!](https://github.com/hrishioa/wishful-search), or [say hi on Twitter!](https://twitter.com/hrishioa)**

## One-click deploy

Deploy your own to Vercel with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhrishioa%2Fwasm-ai&project-name=custom-wasm-ai&repository-name=custom-wasm-ai&demo-title=WASM%20AI&demo-description=Run%20large%20language%20models%20in%20the%20browser%2C%20using%20WebGPU.&demo-url=https%3A%2F%2Fwasmai.vercel.app)

# Usage

Clone the repo. Then:

```bash
yarn
yarn dev
```

That's it!

# Not done yet

1. Error handling - Sometimes things fail. I haven't handled those times yet. For all the other times, there's Masterca-
2. More support - There's a crypto.randomUUID issue on mobile even on WebGPU-enabled Chrome. I'm torn between patching the web-llm package or asking them to help.
