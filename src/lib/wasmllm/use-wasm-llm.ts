"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LLMInBrowser, WebGPUModel } from "./wasmllm";
import { ChatRequestOptions, CreateMessage, Message, nanoid } from "ai";

type UseChatOptions = {
  /**
   * The model to be used for the chat. If not provided, a default one will be
   * used.
   */
  model: WebGPUModel;
  /**
   * Initial messages of the chat. Useful to load an existing chat history.
   */
  initialMessages?: Message[];
  /**
   * Initial input of the chat.
   */
  initialInput?: string;
  /**
   * Callback function to be called when the chat is finished streaming.
   */
  onFinish?: (message: string) => void;
  /**
   * Callback function to be called when an error is encountered.
   */
  onError?: (error: Error) => void;
};

type UseChatHelpers = {
  /** Current status message from the runner. */
  loadingMessage: string;
  /** Loading progress of the model */
  loadingProgress: number;
  /** Current messages in the chat */
  messages: Message[];
  /** The error object of the API request */
  error: undefined | Error;
  /**
   * Append a user message to the chat list. This triggers the API call to fetch
   * the assistant's response.
   * @param message The message to append
   */
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  /**
   * Reload the last AI chat response for the given chat history. If the last
   * message isn't from the assistant, it will request the API to generate a
   * new response.
   */
  reload: () => Promise<string | undefined>;
  /**
   * Abort the current request immediately, keep the generated tokens if any.
   */
  stop: () => void;
  /**
   * Update the `messages` state locally. This is useful when you want to
   * edit the messages on the client, and then trigger the `reload` method
   * manually to regenerate the AI response.
   */
  setMessages: (messages: Message[]) => void;
  /** The current value of the input */
  input: string;
  /** setState-powered method to update the input value */
  setInput: React.Dispatch<React.SetStateAction<string>>;
  /** An input/textarea-ready onChange handler to control the value of the input */
  handleInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  /** Form submission handler to automatically reset input and append a user message  */
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Whether the API request is in progress */
  isLoading: boolean;
};

export function useLocalChat({
  model,
  initialMessages,
  initialInput,
  onFinish,
  onError,
}: UseChatOptions): UseChatHelpers {
  const [llm, setLLM] = useState<LLMInBrowser | null>(null);
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState(initialInput || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<undefined | Error>();
  const llmWorker = useRef<Worker>();
  const [loadingMessage, setLoadingMessage] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    llmWorker.current = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    setLLM(
      new LLMInBrowser(llmWorker.current, setLoadingMessage, setLoadingProgress)
    );
  }, []);

  useEffect(() => {
    if (model && llm) {
      (async () => {
        console.log("Loading model - ", model);
        await llm.load(model);
        console.log("Loaded.");
      })();
      (window as any).llm = llm;
    }
  }, [model, llm]);

  function updateMessage(messages: Message[], newMessage: Message) {
    const editMessageIndex = messages.findIndex((m) => m.id === newMessage.id);

    const newMessages =
      editMessageIndex !== -1
        ? [
            ...messages.slice(0, editMessageIndex),
            newMessage,
            ...messages.slice(editMessageIndex + 1),
          ]
        : [...messages, newMessage];

    return newMessages;
  }

  const append = async (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => {
    if (llm) {
      setIsLoading(true);

      if (!message.id) message.id = nanoid();

      setMessages((messages) => [...messages, message as Message]);

      try {
        const assistantMessage: Message = {
          id: nanoid(),
          content: "",
          createdAt: new Date(),
          role: "assistant",
        };

        await llm.ask(
          message.content,
          (partialMessage: string) => {
            setMessages((messages) => {
              return updateMessage(messages, {
                ...assistantMessage,
                content: partialMessage,
              });
            });
          },
          (fullMessage: string) => {
            setMessages((messages) => {
              return updateMessage(messages, {
                ...assistantMessage,
                content: fullMessage,
              });
            });
            setIsLoading(false);
            onFinish && onFinish(fullMessage);
          }
        );
        return null;
      } catch (err) {
        setError(err as Error);
        onError && onError(err as Error);
        return (err as Error).toString();
      }
    }
  };

  const reload = async () => {
    if (llm) {
      setIsLoading(true);
      try {
        await llm.clearHistory();
        for (const message of messages) {
          await llm.ask(message.content);
        }
      } catch (err) {
        setError(err as Error);
        onError && onError(err as Error);
      } finally {
        setIsLoading(false);
      }

      return "Hello!";
    }
  };

  const stop = async () => {
    if (llm) await llm.stop();
    setIsLoading(false);
  };

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userMessage: Message = {
      id: nanoid(),
      content: input,
      createdAt: new Date(),
      role: "user",
    };
    append(userMessage);
    setInput("");
  };

  return {
    loadingMessage,
    loadingProgress,
    messages,
    error,
    append,
    reload,
    stop,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
  };
}
