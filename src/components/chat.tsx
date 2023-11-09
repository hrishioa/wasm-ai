"use client";

import { type Message } from "ai/react";
import { cn } from "@/lib/utils";

import { ChatList } from "@/components/chat-list";
import { ChatPanel } from "@/components/chat-panel";
import { EmptyScreen } from "@/components/empty-screen";
import { ChatScrollAnchor } from "@/components/chat-scroll-anchor";
import { useLocalChat } from "@/lib/wasmllm/use-wasm-llm";
import { SUPPORTED_LOCAL_MODELS } from "@/lib/wasmllm/supported-models";

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[];
  id?: string;
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const selectedModel = SUPPORTED_LOCAL_MODELS["openhermes-2.5"];

  const {
    loadingMessage,
    loadingProgress,
    messages,
    append,
    reload,
    stop,
    isLoading,
    input,
    setInput,
  } = useLocalChat({
    model: selectedModel,
    initialMessages: initialMessages,
    initialInput: "",
  });

  // const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
  //   'ai-token',
  //   null
  // )

  // const { messages, append, reload, stop, isLoading, input, setInput } =
  //   useChat({
  //     initialMessages,
  //     id,
  //     body: {
  //       id,
  //       previewToken
  //     },
  //     onResponse(response) {
  //       if (response.status === 401) {
  //         toast.error(response.statusText)
  //       }
  //     }
  //   })
  return (
    <>
      <div className={cn("pb-[200px] pt-4 md:pt-10", className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen
            setInput={setInput}
            welcomeMessage={`This chat is running ${selectedModel.simpleName} in your browser!`}
          />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
        loadingMessage={loadingMessage}
        loadingProgress={loadingProgress}
        selectedModel={selectedModel}
      />
    </>
  );
}
