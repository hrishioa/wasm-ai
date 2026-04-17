// Serve the chat workload through a web worker.
//
// In web-llm >= 0.2.30 the old `ChatModule` / `ChatWorkerHandler` pair was
// renamed to `MLCEngine` / `WebWorkerMLCEngineHandler`.
//
// Note: `WebWorkerMLCEngineHandler`'s constructor instantiates its own
// `MLCEngine` internally *and* wires that engine's `setInitProgressCallback`
// to relay reports back to the main thread via `postMessage`. If we construct
// our own engine and assign it to `handler.engine`, we silently lose that
// callback wiring (load works, but UI never sees progress and the form never
// unlocks). So we let the handler manage its own engine.
import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
