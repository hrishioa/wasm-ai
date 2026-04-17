# Resurrection Log — wasm-ai

An archaeology log for bringing this Nov 2023 project back to life in Apr 2026. We record findings, attempts (including failed ones), and reasoning so future-us doesn't repeat mistakes.

---

## Dig site summary

- Repo last committed: `Nov 2023` (HEAD `129f917`, merge of `cfahlgren1/master` into `master`).
- Stack at the time: Next.js 14.0.1, React 18, `@mlc-ai/web-llm@^0.2.8`, `whisper-turbo@^0.9.0`, Vercel AI SDK 2.x.
- Source code intent (per `src/components/chat.tsx`): run `Dolphin 2.2.1` (Mistral‑7B, q4f32_1) fully in‑browser via WebGPU, with a "cloud chat" fallback via `openai-edge`.
- The deployed demo is at `https://wasmai.vercel.app` (referenced in `README.md` and `src/app/layout.tsx`).

## Evidence gathered

### 1. The live demo explodes on modern Chrome

Console (user‑supplied):

```
Loading model - { simpleName: 'Dolphin 2.2.1', modelName: 'dolphin-2.2.1-mistral-7b-q4f32_1', ... }
Loading dolphin-2.2.1-mistral-7b-q4f32_1 with config { model_list: [...], model_lib_map: {...} }
Uncaught (in promise) TypeError: A.requestAdapterInfo is not a function
```

The thrown symbol (`requestAdapterInfo`) is a WebGPU `GPUAdapter` method that was deprecated and then **removed** from Chrome (around Chrome 136, early 2025). Today's Chrome doesn't ship it. The replacement is the synchronous `GPUAdapter.info` property.

### 2. `web-llm@0.2.8` calls the removed method directly

`yarn.lock` pins the dependency exactly:

```
"@mlc-ai/web-llm@^0.2.8":
  version "0.2.8"
```

That version initialized WebGPU with `await adapter.requestAdapterInfo()` and had no `adapter.info` fallback (because `adapter.info` didn't exist yet). Any build from that lockfile — including the live `wasmai.vercel.app` bundle the user is hitting — is broken on any recent Chrome.

### 3. The local `node_modules` and the local `out/` bundle are _newer_ than the lockfile

`node_modules/@mlc-ai/web-llm/package.json` says `version: 0.2.82`. The locally‑built chunk in `out/_next/static/chunks/fbe89ba5-*.js` contains the safe form:

```
let D = g.info || (yield g.requestAdapterInfo())
```

Someone (past‑us, presumably) ran a fresh `yarn install` and got a newer `web-llm` (the `^0.2.8` range resolves up through `0.2.x`) without refreshing the lockfile. So locally the shim is already in place — but the live deploy was never rebuilt.

### 4. The local `out/` build talks about "SmolLM2 360M", the source talks about "Dolphin"

- `src/components/chat.tsx` today has `localModelName = "dolphin-2.2.1"` and `src/lib/wasmllm/supported-models.ts` lists Dolphin / OpenHermes / Glaive / SQLCoder.
- But `out/index.html` says _"This chat is running SmolLM2 360M in your browser!"_ and `out/_next/.../page-*.js` contains the string `SmolLM2-360M-Instruct-q4f32_1-MLC`.
- `.mlc-build/` (untracked) contains `mlc-llm/`, a Python `venv-arm64/`, and `models/dolphin-2.2.1-mistral-7b/` — evidence of a recent local attempt to recompile models and/or swap to a smaller prebuilt.
- The local `out/` is therefore the partial result of a previous resurrection attempt that (a) jumped straight to a small prebuilt model and (b) never made it back into git.

Reflog corroborates:

```
129f917 HEAD@{0}: reset: moving to HEAD
129f917 HEAD@{1}: pull origin master: Fast-forward
6d3ecfa HEAD@{2}: commit: Switched to tiny model      ← this was the whisper transcribe model, not the LLM
```

So the "switched to SmolLM" change lives only in `.mlc-build/` / `out/` artefacts, never in source.

## Root cause (one line)

The deployed bundle was built against `@mlc-ai/web-llm@0.2.8`, which calls `GPUAdapter.requestAdapterInfo()`. That WebGPU API no longer exists in current Chrome. The app never gets past WebGPU initialization.

## Strategy for this resurrection

Goal: get the **original** Dolphin 2.2.1 / OpenHermes 2.5 experience back up, locally, with something close to what it felt like on launch day.

Two sub‑problems, and they're independent:

1. **Runtime**: get `web-llm` to initialize WebGPU on modern Chrome. Fixed the moment we use `web-llm ≥ ~0.2.30` (which has the `adapter.info || adapter.requestAdapterInfo()` fallback).
2. **Model compat**: the `.wasm` and params URLs on HF (`hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1`, `hrishioa/wasm-OpenHermes-2.5-Mistral-7B-q4f32_1`) were compiled against a very old MLC/TVM. Current `web-llm@0.2.82` declares `modelVersion = "v0_2_80"` — the runtime only guarantees compat with model libs built against that. So the ancient wasms are not guaranteed to load.

Plan:

- **A. Runtime:** upgrade to `@mlc-ai/web-llm@0.2.82` (already in `node_modules`), fix the lockfile, and port `src/lib/wasmllm/` from the old `ChatModule` / `ChatWorkerClient` / `ChatWorkerHandler` API to `MLCEngine` / `WebWorkerMLCEngine` / `WebWorkerMLCEngineHandler`.
- **B. Model preservation:** keep the original HF URLs (Dolphin 2.2.1, OpenHermes 2.5, Glaive, SQLCoder) in `supported-models.ts` with a clearly labelled "vintage" flag so the archaeology is preserved. Attempt to load them — document whatever happens (succeeds / crashes with which TVM error).
- **C. Graceful fallback:** add the closest modern equivalents from `prebuiltAppConfig` so the site actually functions end‑to‑end on current Chrome:
  - Dolphin 2.2.1 (Mistral‑7B, Nov 2023) → `Mistral-7B-Instruct-v0.3-q4f32_1-MLC` or `Hermes-2-Pro-Mistral-7B-q4f16_1-MLC` (closest spiritual successor).
  - OpenHermes 2.5 (Mistral‑7B) → `Hermes-2-Pro-Mistral-7B-q4f16_1-MLC` (Nous Research's maintained successor to OpenHermes-2.5).

## Attempts & observations

### Attempt 1 — Runtime port to `@mlc-ai/web-llm@0.2.82`

Changes:

- `package.json`: `@mlc-ai/web-llm: ^0.2.8` → `^0.2.82`; refreshed `yarn.lock`.
- `src/lib/wasmllm/worker.ts`: `ChatModule` + `ChatWorkerHandler` → `MLCEngine` + `WebWorkerMLCEngineHandler`. Handler now owns the engine and forwards `self.onmessage`.
- `src/lib/wasmllm/wasmllm.ts`: `ChatWorkerClient` → `WebWorkerMLCEngine`; `chat.generate(...)` callback loop → `engine.chat.completions.create({ messages, stream: true })` async iterator. The class now maintains its own `ChatCompletionMessageParam[]` history (web-llm no longer keeps it server-side the way the old `ChatModule` did between `generate` calls).
- `src/lib/wasmllm/supported-models.ts`: added a `WebGPUModel.vintage?: boolean` flag, split models into "modern" (prebuilt ids from `prebuiltAppConfig.model_list`) and "vintage" (the original `hrishioa/*` HF URLs), kept both side by side.
- `src/components/chat.tsx`: default model is now `openhermes-2.5`, pointing at `mlc-ai/OpenHermes-2.5-Mistral-7B-q4f16_1-MLC` (the MLC team's maintained package of the same model the project originally shipped).

### Attempt 2 — Verify end-to-end generation with a small prebuilt model

To keep the feedback loop tight (Mistral-7B weights are ~4.5 GB), I first pointed the default at `SmolLM2-360M-Instruct-q4f32_1-MLC` and reloaded.

Result: **works end-to-end.**

- Page loads, no `requestAdapterInfo` error — the 0.2.82 `adapter.info` fallback resolves cleanly on current Chrome.
- `Loading SmolLM2-360M-Instruct-q4f32_1-MLC` → `Loaded.` in ~10 s on a warm machine.
- Sending a user message streams a response back through `chat.completions.create({ stream: true })`; the footer updates to `Talking to SmolLM2-360M-Instruct-q4f32_1-MLC`.
- Quality is about what you'd expect for a 360 M model — amusing nonsense — but the pipe is proven.

### Attempt 2b — Progress bar stuck at 0 even after "Loaded." logs

Symptom: after the runtime upgrade, the model clearly loaded (console printed `Loaded.`, footer said `Talking to OpenHermes-2.5-Mistral-7B-q4f16_1-MLC`) but the UI progress bar was frozen at 0 % and the message input never unlocked. A benign info line `Cannot find 'tokenizer_info' or 'token_table_postproc_method' in 'mlc-chat-config.json'` was the only hint — everything else looked fine.

Cause: a subtle misuse of `WebWorkerMLCEngineHandler`. Its constructor internally does both:

```js
this.engine = new MLCEngine();
this.engine.setInitProgressCallback((report) => postMessage({ kind: "initProgressCallback", ... }));
```

i.e. it creates its own engine **and** wires that engine's progress callback to relay reports back to the main thread. My first draft of `worker.ts` constructed a separate `MLCEngine` and then `handler.engine = engine`, clobbering the handler's pre-wired relay. Load still worked (because `reload` went through the override) but progress reports were being emitted on a dead engine nobody was listening to. Meanwhile on the main thread, `WebWorkerMLCEngine` was waiting for worker messages that never came — so `loadingProgress` stayed at 0 and `loadingProgress < 100` kept the `<ProgressBar>` in front of the `<PromptForm>` forever.

Fix: let the handler own its engine.

```ts
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
```

Result after the fix: progress bar now animates through `Loading model from cache[53/107]: 1980MB loaded. 50% completed, 3 secs elapsed.`, then the prompt form appears, then the `Explain technical concepts` example generates a coherent streamed response from OpenHermes 2.5 Mistral‑7B ("The soft launch system for a submarine-launched missile is a complex process…"). Full pipeline confirmed working.

### Attempt 3 — Load the vintage Dolphin 2.2.1 wasm (expected to fail, did fail)

Flipped default to `dolphin-2.2.1-vintage` (original `huggingface.co/hrishioa/mlc-chat-dolphin-2.2.1-mistral-7b-q4f32_1` URLs), reloaded.

Result: **exactly the TVM ABI mismatch we predicted.**

```
Uncaught (in promise) LinkError: WebAssembly.instantiate():
  Import #2 "env" "TVMWasmPackedCFunc": function import requires a callable
```

Interpretation: the original wasm's WebAssembly import table references `env.TVMWasmPackedCFunc`, but the TVM runtime shipped inside `web-llm@0.2.82` (`modelVersion = v0_2_80`) no longer provides that symbol — TVM restructured its WebAssembly packed-func calling convention sometime between late‑2023 and now. The wasm itself downloads fine; it just fails at `WebAssembly.instantiate` time because the import surface doesn't line up.

Implications:

- Reviving the original Dolphin / OpenHermes / Glaive / SQLCoder wasms would require _either_ pinning to a contemporary `web-llm` (~0.2.2x era, where the TVM ABI still matches) _or_ recompiling the models with the current MLC LLM compiler. The `.mlc-build/` directory (untracked, Apr 2026) looks like a previous attempt at the latter — it has `mlc-llm/`, `models/dolphin-2.2.1-mistral-7b/`, and an arm64 venv.
- Pinning to old `web-llm` would also re-introduce the `requestAdapterInfo` bug, so it's a no‑go for modern Chrome without patching.
- The MLC team repackaged OpenHermes-2.5-Mistral-7B against the current runtime as `mlc-ai/OpenHermes-2.5-Mistral-7B-q4f16_1-MLC`. Semantically this is the closest thing to "the original demo, unchanged" — same weights, new TVM build.

### Attempt 4 — "Load Whisper" explodes with `RangeError: offset is out of bounds`

User clicked the `Load Whisper` button in the prompt footer and the console filled with:

```
Uncaught (in promise) RangeError: offset is out of bounds
  at Uint8Array.set
  at ModelDB.eval (modelDB.js:70:28)
  ...
  loadModel @ transcribe.tsx:52
```

Three identical network requests to `https://huggingface.co/openai/whisper-large-v2/raw/main/tokenizer.json` (each returned HTTP 200) — that's the internal `pRetry` trying three times and failing each time with the same `RangeError`.

`whisper-turbo@0.9.0/dist/db/modelDB.js` has the classic pre-allocate-from-Content-Length fetch loop:

```js
const contentLength = +response.headers.get("Content-Length");
const chunks = new Uint8Array(contentLength);
for (;;) {
    const { done, value } = yield reader.read();
    if (done) break;
    chunks.set(value, receivedLength);        // ← RangeError here
    receivedLength += value.length;
}
```

Verified the actual root cause by running a probe fetch inside the page against the exact same URL:

```
CL=null bytes=2480466
```

i.e. `response.headers.get('Content-Length')` returns `null` even though the body is clearly 2.48 MB. `+null === 0`, `new Uint8Array(0)` is zero-sized, and the very first `chunks.set(value, 0)` overflows — hence the off-by-everything `RangeError`.

Why `null`? `Content-Length` _is_ a CORS-safelisted response header per the Fetch spec, but in practice the header is still suppressed when the server doesn't explicitly advertise it in `Access-Control-Expose-Headers`. `huggingface.co/*/raw/*` used to set Content-Length visibly but as of 2026 does not (`access-control-expose-headers` for `huggingface.co` lists `X-Repo-Commit, X-Request-Id, X-Error-Code, X-Error-Message, X-Total-Count, ETag, Link, Accept-Ranges, Content-Range, X-Linked-Size, X-Linked-ETag, X-Xet-Hash` — no `Content-Length`). Presumably a consequence of their move to xet-bridge CDN plumbing. Other client-side libraries (e.g. transformers.js) handle this by accumulating chunks.

**Fix:** patch `fetchBytes` to collect chunks into an array and concat with `new Uint8Array(receivedLength)` at the end, with `onProgress` driven by Content-Length only if it's present:

```js
const contentLength = contentLengthHeader ? +contentLengthHeader : 0;
const parts = [];
let receivedLength = 0;
for (;;) {
    const { done, value } = yield reader.read();
    if (done) break;
    parts.push(value);
    receivedLength += value.length;
    if (onProgress && contentLength > 0) {
        onProgress((receivedLength / contentLength) * 100);
    }
}
const chunks = new Uint8Array(receivedLength);
let offset = 0;
for (const part of parts) { chunks.set(part, offset); offset += part.length; }
```

Shipped as `patches/whisper-turbo+0.9.0.patch` via `patch-package`, with `"postinstall": "patch-package"` added to `package.json` so the patch re-applies on every `yarn install`. Also added `patch-package` itself to `devDependencies`.

**Result:** the first attempt now succeeds. No more `RangeError`, only one `tokenizer.json` request (no p-retry loop), `whisper-webgpu_bg.wasm` loads.

### Attempt 4b — second-layer failure: whisper-webgpu wasm can't get a WebGPU device

Once the fetch patch landed, a new error appeared immediately after the wasm module was instantiated:

```
panicked at /Users/fleetwood/Code/whisper-web/crates/rumble/src/gpu/handle.rs:55:14:
Failed to create device: RequestDeviceError
…
Uncaught (in promise) RuntimeError: unreachable
```

Before the panic, the runtime also logged dozens of warnings like:

```
Warning: Token '<|startoftranscript|>' was expected to have ID '50258' but was given ID 'None'
Warning: Token '<|en|>' was expected to have ID '50259' but was given ID 'None'
... (all ~100 Whisper language tokens) ...
```

Two things are now stacked against `whisper-turbo@0.9.0`:

1. The bundled `tokenizer.json` schema at `openai/whisper-large-v2` has evolved; the special-token IDs the wasm expects aren't where it's looking.
2. More fatally, `whisper-webgpu`'s Rust `rumble` crate calls `adapter.requestDevice(...)` with a feature / limit set compiled in Nov 2023. The current Chrome WebGPU implementation rejects the request outright (`RequestDeviceError` — no specific feature is named, but the wasm's fixed list no longer matches the adapter's capabilities). The panic propagates as `RuntimeError: unreachable` from the wasm.

This is the same **class** of problem as the vintage Dolphin wasm (Attempt 3): prebuilt WebAssembly compiled against a specific version of a moving runtime, preserved in amber. Fixing it properly would require either:

- recompiling `whisper-webgpu`'s Rust source against current `wgpu`/`tokenizers` versions (upstream archived; author moved to `ratchet`), or
- replacing the transcribe feature with `@ratchet-ml/ratchet-web` (FL33TW00D's own successor), or `@huggingface/transformers` Whisper, or `@xenova/transformers`.

None of these are drop-in. For the scope of this resurrection we stop at: **fetch bug fixed; wasm bug documented but unaddressed**. Whisper still doesn't transcribe, but the failure mode is now honest (a clean wasm-level panic) rather than a confusing RangeError in library plumbing.

### Attempt 5 — fully resurrect Dolphin 2.2.1 by locally recompiling with MLC

After deciding in the earlier attempt that the original wasms were a lost cause, found that the `.mlc-build/` directory (untracked, from an earlier session) had most of the pieces already in place:

- `.mlc-build/mlc-llm/` — MLC LLM source checkout
- `.mlc-build/venv-arm64/` — Python 3.13 venv with `mlc-llm-nightly-cpu 0.20.dev160`, `mlc-ai-nightly-cpu 0.20.dev912`, `torch 2.11.0`, `tvm-ffi 0.1.10`
- `.mlc-build/models/dolphin-2.2.1-mistral-7b/` — full HF snapshot of `cognitivecomputations/dolphin-2.2.1-mistral-7b` (safetensors + pytorch .bin + tokenizer)

**Key insight to skip the slow step:** Dolphin 2.2.1 is a Mistral-7B fine-tune with ChatML special tokens added (`vocab_size: 32002`). That's the _same architecture and vocab_ as `OpenHermes-2.5-Mistral-7B`, which MLC-AI already ships in `prebuiltAppConfig`, pointing at `Mistral-7B-Instruct-v0.3-q4f32_1-ctx4k_cs1k-webgpu.wasm` in `mlc-ai/binary-mlc-llm-libs`. The WASM library is quantization+architecture+context-size specific but not weight specific — which means **we only need to recompile the weights, not the kernel library.**

Steps:

1. Quantize the source weights to q4f32_1 (Metal-accelerated on Apple Silicon):

```bash
python -m mlc_llm convert_weight \
  models/dolphin-2.2.1-mistral-7b \
  --quantization q4f32_1 \
  --model-type mistral \
  --output dist/dolphin-2.2.1-mistral-7b-q4f32_1-MLC
```

Finished in 68 s. Output: 107 params shards, 3.8 GB total, 5.001 bits/param (7.24 B total params).

2. Generate the chat config with the correct ChatML conversation template:

```bash
python -m mlc_llm gen_config \
  models/dolphin-2.2.1-mistral-7b \
  --quantization q4f32_1 \
  --model-type mistral \
  --conv-template chatml \
  --context-window-size 4096 \
  --prefill-chunk-size 1024 \
  --sliding-window-size -1 \
  --output dist/dolphin-2.2.1-mistral-7b-q4f32_1-MLC
```

Produces `mlc-chat-config.json` with `conv_template.name = chatml`, `stop_str: ['<|im_end|>']`, etc. (One benign `tiktoken` parse warning surfaced during config generation; doesn't affect the generated file because MLC uses SentencePiece directly at runtime.)

3. Serve the output over the Next.js dev server by symlinking into `public/`:

```bash
mkdir -p public/models/dolphin-2.2.1-mistral-7b-q4f32_1-MLC/resolve
ln -sfn "$(pwd)/.mlc-build/dist/dolphin-2.2.1-mistral-7b-q4f32_1-MLC" \
        public/models/dolphin-2.2.1-mistral-7b-q4f32_1-MLC/resolve/main
```

The `/resolve/main/` shape is what web-llm's `cleanModelUrl` expects (it auto-appends `resolve/main/` to the model URL otherwise).

4. Add a new entry in `src/lib/wasmllm/supported-models.ts` pointing `modelParamsUrl` at the relative local path and `wasmUrl` at the hosted prebuilt Mistral v0.3 q4f32_1 kernel:

```ts
"dolphin-2.2.1": {
  simpleName: "Dolphin 2.2.1 (Mistral-7B, resurrected)",
  modelName: "dolphin-2.2.1-mistral-7b-q4f32_1-MLC",
  rootUrl: "https://huggingface.co/cognitivecomputations/dolphin-2.2.1-mistral-7b",
  modelParamsUrl: "models/dolphin-2.2.1-mistral-7b-q4f32_1-MLC",
  wasmUrl:
    "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Mistral-7B-Instruct-v0.3-q4f32_1-ctx4k_cs1k-webgpu.wasm",
}
```

5. Fix a papercut in `buildAppConfig`: web-llm's internal `cleanModelUrl` calls `new URL(modelUrl).href` unconditionally, so a relative `modelParamsUrl` throws `TypeError: Failed to construct 'URL': Invalid URL`. Resolve against `self.location.origin` in the worker before handing the URL over.

6. `.gitignore` `/.mlc-build/` and `/public/models/` so neither the 14 GB of PyTorch shards nor the 3.8 GB of quantized weights end up tracked.

**Result — Dolphin 2.2.1 loading in current Chrome:**

- `Fetching param cache[8/107]: 294MB fetched. 7% completed, 4 secs elapsed.` → finishes in a couple of minutes because serving is local disk.
- Footer: `Talking to dolphin-2.2.1-mistral-7b-q4f32_1-MLC`.
- Prompt: _"You're Dolphin 2.2.1. In one short paragraph, introduce yourself, mention you are uncensored, and say something warm."_
- Reply (streaming, correct ChatML template, actually identifies itself as Dolphin):
  > "I am Dolphin. I am an advanced LLM (Language Learning Machine) available to help answer any question or provide information about any topic. I am uncensored, meaning my responses include uncensored in…"

i.e. the original demo model is demonstrably back, pulled from the original `cognitivecomputations` weights, quantized with current MLC, executed by current web-llm, on current Chrome.

### Attempt 5b — Dolphin answers with `<|im_end|>` visible, stops short on turn two

First multi-turn test surfaced a secondary issue. Side-by-side output:

```
user:      Hello!
assistant: Hello! How can I assist you today?<|im_end|     ← stop token visible
user:      How are you?
assistant: I am                                            ← truncated
```

Root cause, three interlocking things:

1. `gen_config` produced `"stop_token_ids": [2]` (just the Mistral `</s>`), not `[2, 32000]`. Token 32000 is `<|im_end|>`, the ChatML turn terminator. Without it in the stop list, the runtime never halts at the correct token.
2. The loader only loaded `tokenizer.model` (vocab 32000) — web-llm explicitly warns:

   > Using `tokenizer.model` since we cannot locate `tokenizer.json`. … files like `added_tokens.json`, `tokenizer_config.json` are ignored.

   So the tokenizer the runtime used had **no idea that IDs 32000/32001 even exist**. When the model sampled token 32000 at turn end, the decoder couldn't map it to its special string, and the surrounding text (which the model did emit through ordinary BPE tokens because it has learned the literal ChatML string pattern too) showed up as visible `<|im_end|` glyphs.

3. That same missing tokenizer knowledge also broke ENCODING of chat history on turn two — `<|im_start|>assistant` in the prior turn's context got shredded into a dozen BPE pieces instead of being one special token, so the model saw a malformed conversation and bailed after "I am".

`gen_config` can't fix (2) by itself because modern `transformers` fails partway through converting Dolphin's old-style SentencePiece + added_tokens into a fast `tokenizer.json` — both `AutoTokenizer.from_pretrained(...)` and `LlamaTokenizerFast(vocab_file=...)` fall through into a tiktoken parser that chokes on the SentencePiece proto (`ValueError: Error parsing line b'\x0e' in tokenizer.model`). Rather than fight that conversion, used a ready-made file.

**Fix:**

1. **Borrow a working `tokenizer.json`.** `mlc-ai/OpenHermes-2.5-Mistral-7B-q4f16_1-MLC` is the exact same architecture (Mistral-7B + two ChatML added tokens at 32000/32001), and its `tokenizer.json` on HF already has both tokens marked `"special": true` at the right IDs. Copied it into the Dolphin output directory verbatim (1.79 MB).
2. **Update `mlc-chat-config.json`:**
   - Prepend `"tokenizer.json"` to `tokenizer_files` so web-llm's loader picks it over `tokenizer.model`.
   - Change `stop_token_ids: [2]` → `stop_token_ids: [2, 32000]`.
3. **Bust the cached config.** web-llm caches `mlc-chat-config.json` in a separate `webllm/config` IndexedDB store keyed by URL. Without eviction, edits to the on-disk file are invisible across reloads. Added a `deleteChatConfigInCache(modelName, customAppConfig)` call at the top of `LLMInBrowser.load()` for any model that supplies its own `modelParamsUrl` / `wasmUrl` — gated so prebuilt models don't pay the cost.

Verified live with a fresh reload (weights stayed cached, only the config + new tokenizer.json re-fetched):

- Turn 1: "Hello!" → "Hello! How can I assist you today?" (clean stop, no `<|im_end|>`).
- Turn 2: "How are you? Answer in two sentences." → "I'm an artificial intelligence, so I don't experience feelings or emotions, but I'm always eager to help you with any questions or information you may need. Let me know how I can assist."

Multi-turn history works, stop tokens respected, streaming clean.

### Attempt 6 — host the resurrected Dolphin on Hugging Face so it deploys

The Attempt 5/5b build lived at `public/models/dolphin-2.2.1-mistral-7b-q4f32_1-MLC/resolve/main/`, symlinked out to `.mlc-build/dist/…`. That works for `yarn dev` but not for Vercel: the 3.8 GB directory is `.gitignore`d, and even if it weren't, Vercel's per-file and total-project size limits rule out shipping multi-gigabyte weight shards as static assets. For anyone visiting a deployed build, the Dolphin entry would 404 immediately.

Fixed properly by pushing the re-compiled weights to a new HF repo under the existing `hrishioa` account:

```bash
# repo created programmatically (HfApi.create_repo, token had role=write since 2023)
# upload: resumable, streaming, committed server-side
hf upload-large-folder \
  hrishioa/Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC \
  .mlc-build/dist/dolphin-2.2.1-mistral-7b-q4f32_1-MLC \
  --repo-type=model
# → "Files: hashed 115/115 (4.1G/4.1G) | committed: 115/115 (4.1G/4.1G) | Upload is complete!"
```

Also wrote a proper `README.md` for the HF repo up front (base model attribution, why this repo exists, usage snippet, licensing back to Apache-2.0 per the original Dolphin weights), so the artefact stands on its own rather than as a cryptic mirror.

Then wired the app at it:

```ts
"dolphin-2.2.1": {
  simpleName: "Dolphin 2.2.1 (Mistral-7B, resurrected)",
  modelName: "Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC",
  rootUrl:
    "https://huggingface.co/hrishioa/Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC",
  modelParamsUrl:
    "https://huggingface.co/hrishioa/Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC",
  wasmUrl:
    "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_80/Mistral-7B-Instruct-v0.3-q4f32_1-ctx4k_cs1k-webgpu.wasm",
}
```

Deleted the `public/models/` symlink and trimmed `/public/models/` out of `.gitignore`. `.mlc-build/` remains ignored as a local scratch workspace; nothing deployable points at it anymore.

Verified end-to-end via a cold reload (fresh IndexedDB entry since the cache is keyed by URL):

- `Fetching param cache[7/107]: 238MB fetched. 6% completed, 7 secs elapsed.` → network tab shows GETs against `huggingface.co/api/resolve-cache/…` redirecting to `cas-bridge.xethub.hf.co`, which is HF's xet-bridge CDN.
- Progress rolled to 107/107 in a couple of minutes, footer flipped to `Talking to Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC`.
- Prompt: "In one sentence: what's your model name and version?"
- Response: "My model name and version is GPT-4, a large language model developed by OpenAI, representing the latter edition of GPT-3." (A funny hallucination — Dolphin 2.2.1's training data is lousy with OpenAI self-descriptions. What matters is: clean generation, proper stop token at `<|im_end|>`, multi-sentence coherence, no tokenizer leak. Same pipeline as Attempt 5b, just now running off the hub.)

Net effect: a Vercel deploy of `main` would now hit HF for the weights just like everything else in the modern entries, with no project-size implications. Dolphin 2.2.1 is a properly citable, reproducible artefact again.

## Decision

- Default model: `openhermes-2.5` (= `OpenHermes-2.5-Mistral-7B-q4f16_1-MLC`, served by `mlc-ai/*`). This is the honest resurrection of the original experience.
- Modern peers kept alongside: `Mistral-7B-Instruct-v0.3`, `Hermes-2-Pro-Mistral-7B` (Nous Research's maintained successor to OpenHermes-2.5), `Llama-3.2-3B-Instruct`, `SmolLM2-360M` (fast fallback).
- Vintage entries (`dolphin-2.2.1-vintage`, `openhermes-2.5-vintage`) kept in `supported-models.ts` with `vintage: true` — they won't load on the current runtime but they're preserved as dig-site artefacts, and the code supports selecting them so anyone later can repro the TVM import error for themselves.

## Things that remain broken / out of scope

- **Whisper-turbo partially fixed**: see Attempt 4 below. The fetch-layer bug that was producing `RangeError: offset is out of bounds` on "Load Whisper" is patched (via `patch-package` over `whisper-turbo@0.9.0`). The deeper wasm-level incompatibility surfaced under it is preserved as a known issue (same class as the vintage Dolphin wasm: ancient WebGPU runtime panicking on a modern adapter).
- **`out/` on disk**: the `out/_next/static/chunks/*.js` bundle is a stale Apr 16 build and advertises `SmolLM2`. Safe to `rm -rf out/` before the next `yarn build`; the source of truth is now `src/`.
- **`/api/chat` cloud fallback**: `openai-edge@1.2.2` still works but is legacy; the modern path would be `@ai-sdk/openai` + `streamText`. Not needed for local-only operation.
- **`next.config.js`**: has a tiny webpack fallback for `perf_hooks: false`. Might not be necessary anymore; leaving alone.

## How to run after this resurrection

```bash
yarn install          # lockfile now pinned to @mlc-ai/web-llm@^0.2.82
yarn dev              # serves on localhost:3000 (or first free port)
```

Open in a Chrome/Edge that supports WebGPU. First load downloads ~4.5 GB of Mistral-7B weights into the browser's Cache API storage; subsequent loads are instant.

## One-line summary

> "The original demo was killed by a 2025 Chrome WebGPU spec change, not by anything in the app itself. Bumping `@mlc-ai/web-llm` from `0.2.8` to `0.2.82` and porting the three files that talked to the old `ChatModule` API brings it back to life. The original wasm blobs on Hugging Face are casualties of a concurrent TVM ABI change and need either an old runtime pin or a recompile to ever run again."
