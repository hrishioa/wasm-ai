import { type UseChatHelpers } from "ai/react";

import { Button } from "@/components/ui/button";
import { PromptForm } from "@/components/prompt-form";
import { ButtonScrollToBottom } from "@/components/button-scroll-to-bottom";
import { IconRefresh, IconStop } from "@/components/ui/icons";
import { FooterText } from "@/components/footer";
import ProgressBar from "@/components/ui/progress";
import { WebGPUModel } from "@/lib/wasmllm/wasmllm";
import { ExternalLink } from "@/components/external-link";
import { Transcribe } from "./transcribe";

export interface ChatPanelProps
  extends Pick<
    UseChatHelpers,
    | "append"
    | "isLoading"
    | "reload"
    | "messages"
    | "stop"
    | "input"
    | "setInput"
  > {
  id?: string;
}

export function ChatPanel({
  id,
  isLoading,
  stop,
  append,
  reload,
  input,
  setInput,
  messages,
  loadingMessage,
  loadingProgress,
  selectedModel,
  localModel,
}: ChatPanelProps & {
  loadingMessage: string;
  loadingProgress: number;
  selectedModel: WebGPUModel;
  localModel: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-gradient-to-b from-muted/10 from-10% to-muted/30 to-50%">
      <ButtonScrollToBottom />
      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="flex h-10 items-center justify-center space-x-2">
          {isLoading ? (
            <Button
              variant="outline"
              onClick={() => stop()}
              className="bg-background"
            >
              <IconStop className="mr-2" />
              Stop generating
            </Button>
          ) : null}
        </div>
        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          {loadingProgress < 100 ? (
            <ProgressBar progress={loadingProgress} />
          ) : (
            <PromptForm
              onSubmit={async (value) => {
                await append({
                  id,
                  content: value,
                  role: "user",
                });
              }}
              input={input}
              setInput={setInput}
              isLoading={isLoading}
            />
          )}
          <FooterText>
            {loadingProgress < 100 ? (
              loadingMessage || "Waiting to load model..."
            ) : localModel ? (
              <ExternalLink
                href={selectedModel.rootUrl || "https://olickel.com"}
              >
                Talking to {selectedModel.modelName}
              </ExternalLink>
            ) : (
              "You are talking to a cloud model. Boo!"
            )}
          </FooterText>
        </div>
      </div>
    </div>
  );
}
