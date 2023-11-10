import { useEffect, useRef, useState } from "react";
import {
  AvailableModels,
  InferenceSession,
  SessionManager,
} from "whisper-turbo";
import ProgressBar from "./ui/progress";
import { Button, buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";
import MicButton, { AudioMetadata } from "./micbutton";
import { UseChatHelpers } from "ai/react";

export const Transcribe = ({
  setInput,
  setAudioActive,
}: Pick<UseChatHelpers, "setInput"> & {
  setAudioActive: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [modelLoading, setModelLoading] = useState<boolean>(false);
  const [loadedModel, setLoadedModel] = useState<AvailableModels | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [audioMetadata, setAudioMetadata] = useState<AudioMetadata | null>(
    null
  );
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState<boolean>(false);

  const transcription = useRef<string>("");

  const TRANSCRIBING_TEXT = " (transcribing...)";

  const selectedModel = AvailableModels.WHISPER_TINY;

  const session = useRef<InferenceSession | null>(null);

  const loadModel = async () => {
    if (session.current) {
      session.current.destroy();
    }
    if (modelLoading) {
      return;
    }
    if (!selectedModel) {
      console.error("No model selected");
      return;
    }
    setModelLoading(true);

    const manager = new SessionManager();
    const loadResult = await manager.loadModel(
      selectedModel,
      () => {
        setLoaded(true);
        setLoadedModel(selectedModel);
      },
      (p: number) => setProgress(p)
    );
    if (loadResult.isErr) {
      console.error(loadResult.error.message);
    } else {
      setModelLoading(false);
      session.current = loadResult.value;
    }
  };

  useEffect(() => {
    const runSession = async () => {
      console.log("Trying to transcribe");

      if (!session.current) {
        console.error("No model loaded");
        return;
      }
      if (!audioData) {
        console.error("No audio file loaded");
        return;
      }

      setInput((input) => input + TRANSCRIBING_TEXT);
      setTranscribing(true);
      setAudioActive(true);
      await session.current.transcribe(
        audioData!,
        audioMetadata!.fromMic,
        (s: any) => {
          if (s && s.text) transcription.current += s.text;
        }
      );
      setInput((input) =>
        input.endsWith(TRANSCRIBING_TEXT)
          ? input.slice(0, -TRANSCRIBING_TEXT.length) +
            " " +
            transcription.current
          : input
      );
      transcription.current = "";
      setAudioData(null);
      setAudioActive(false);
      setTranscribing(false);

      console.log("Transcription done");
    };

    if (audioData && loadedModel && !transcribing) {
      runSession();
    }
  }, [
    audioMetadata,
    audioData,
    loadedModel,
    transcribing,
    setInput,
    setAudioActive,
  ]);

  return (
    (selectedModel != loadedModel && progress == 0 && (
      <Button
        type="button"
        onClick={loadModel}
        className={cn(
          buttonVariants({ size: "sm", variant: "outline" }),
          "relative -left-4 -top-14 h-8 rounded-sm bg-background text-primary"
        )}
      >
        {modelLoading ? "Loading..." : "Load Whisper"}
      </Button>
    )) || (
      <MicButton
        setAudioActive={setAudioActive}
        setBlobUrl={setBlobUrl}
        setAudioData={setAudioData}
        setAudioMetadata={setAudioMetadata}
        setInput={setInput}
      />
    )
  );
};
