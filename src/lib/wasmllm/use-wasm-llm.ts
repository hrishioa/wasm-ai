'use client'

import { useState, useEffect } from 'react';
import { LLMInBrowser, WebGPUModel } from './wasmllm';

type UseChatOptions = {
    /**
     * The model to be used for the chat. If not provided, a default one will be
     * used.
     */
    model: WebGPUModel;
    /**
     * Initial messages of the chat. Useful to load an existing chat history.
     */
    initialMessages?: string[];
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
    /** Current messages in the chat */
    messages: string[];
    /** The error object of the API request */
    error: undefined | Error;
    /**
     * Append a user message to the chat list. This triggers the API call to fetch
     * the assistant's response.
     * @param message The message to append
     */
    append: (message: string) => Promise<void>;
    /**
     * Reload the last AI chat response for the given chat history. If the last
     * message isn't from the assistant, it will request the API to generate a
     * new response.
     */
    reload: () => Promise<void>;
    /**
     * Abort the current request immediately, keep the generated tokens if any.
     */
    stop: () => void;
    /**
     * Update the `messages` state locally. This is useful when you want to
     * edit the messages on the client, and then trigger the `reload` method
     * manually to regenerate the AI response.
     */
    setMessages: (messages: string[]) => void;
    /** The current value of the input */
    input: string;
    /** setState-powered method to update the input value */
    setInput: React.Dispatch<React.SetStateAction<string>>;
    /** An input/textarea-ready onChange handler to control the value of the input */
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
    /** Form submission handler to automatically reset input and append a user message  */
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    /** Whether the API request is in progress */
    isLoading: boolean;
};

export function useLocalChat({ model, initialMessages, initialInput, onFinish, onError }: UseChatOptions): UseChatHelpers {
    const [llm] = useState(new LLMInBrowser(true));
    const [messages, setMessages] = useState(initialMessages || []);
    const [input, setInput] = useState(initialInput || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<undefined | Error>();

    useEffect(() => {
        llm.load(model).catch(setError);
    }, [model, llm]);

    const append = async (message: string) => {
        setIsLoading(true);
        try {
            await llm.ask(message);
            const response = llm.getState().latestResponse;
            setMessages([...messages, message, response]);
            onFinish && onFinish(response);
        } catch (err) {
            setError(err as Error);
            onError && onError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const reload = async () => {
        setIsLoading(true);
        try {
            await llm.clearHistory();
            for (const message of messages) {
                await llm.ask(message);
            }
        } catch (err) {
            setError(err as Error);
            onError && onError(err as Error);
        } finally {
            setIsLoading(false);
        }
    };

    const stop = async () => {
        await llm.unload();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        append(input);
        setInput('');
    };

    return {
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