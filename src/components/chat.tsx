"use client";

import { useChat, type Message } from "ai/react";
import { cn } from "@/lib/utils";

import { ChatList } from "@/components/chat-list";
import { ChatPanel } from "@/components/chat-panel";
import { EmptyScreen } from "@/components/empty-screen";
import { ChatScrollAnchor } from "@/components/chat-scroll-anchor";
import { useLocalChat } from "@/lib/wasmllm/use-wasm-llm";
import { SUPPORTED_LOCAL_MODELS } from "@/lib/wasmllm/supported-models";
import toast from 'react-hot-toast';

export interface ChatProps extends React.ComponentProps<"div"> {
  initialMessages?: Message[];
  id?: string;
}

// Edit this line to change if you're calling a local model or not. Make sure to set an OPENAI_API_KEY in the env file!
const USE_LOCAL_CHAT = true;
// Select your local model. You might be able to hotswap this at runtime, haven't tested.
const localModelName: keyof typeof SUPPORTED_LOCAL_MODELS = "dolphin-2.2.1";

export function Chat({ id, initialMessages, className }: ChatProps) {
  const selectedModel = SUPPORTED_LOCAL_MODELS[localModelName];
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
  // Apologies eslint this is just me showing off
  // eslint-disable-next-line react-hooks/rules-of-hooks
  } = USE_LOCAL_CHAT ? useLocalChat({
    model: selectedModel,
    initialMessages: initialMessages,
    initialInput: "",
  // eslint-disable-next-line react-hooks/rules-of-hooks
  }) : {...useChat({
    initialMessages,
    id,
    body: {
      id,
    },
    onResponse(response) {
      if (response.status === 401) {
        toast.error(response.statusText)
      }
    }
  }), loadingMessage: "You are now talking to a cloud model. Boo!", loadingProgress: 100};

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
        localModel={USE_LOCAL_CHAT}
      />
    </>
  );
}
