import { useState } from "react";
import { MicRecorder } from "whisper-turbo";
import { IconListening, IconMic, IconPlus } from "./ui/icons";
import { buttonVariants } from "./ui/button";
import { cn } from "../lib/utils";
import { UseChatHelpers } from "ai/react";

const SAMPLE_RATE = 16000;

type MicButtonProps = {
  setBlobUrl: (blobUrl: string) => void;
  setAudioData: (audioData: Uint8Array) => void;
  setAudioMetadata: (audioMetadata: AudioMetadata) => void;
  setAudioActive: React.Dispatch<React.SetStateAction<boolean>>;
} & Pick<UseChatHelpers, "setInput">;

export interface AudioMetadata {
  file: File;
  fromMic: boolean;
}

const MicButton = (props: MicButtonProps) => {
  const [mic, setMic] = useState<MicRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const LISTENING_TEXT = " (listening...)";

  const handleRecord = async () => {
    setMic(await MicRecorder.start());
  };

  const handleStop = async () => {
    if (!mic) {
      return;
    }
    let recording = await mic.stop();
    let ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    let resampled = await ctx.decodeAudioData(recording.buffer);
    let ch0 = resampled.getChannelData(0);
    props.setAudioData(new Uint8Array(ch0.buffer));

    let blob = recording.blob;
    props.setAudioMetadata({
      file: new File([blob], "recording.wav"),
      fromMic: true,
    });
    props.setBlobUrl(URL.createObjectURL(blob));
    setMic(null);
  };

  const handleClick = async () => {
    if (isRecording) {
      props.setInput((input) =>
        input.endsWith(LISTENING_TEXT)
          ? input.slice(0, -LISTENING_TEXT.length)
          : input
      );
      props.setAudioActive(false);
      await handleStop();
    } else {
      props.setInput((input) => input + LISTENING_TEXT);
      props.setAudioActive(true);
      await handleRecord();
    }
    setIsRecording(!isRecording);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "absolute left-0 top-4 h-8 w-8 rounded-full p-0 sm:left-4",
        isRecording
          ? "bg-red-600 text-background hover:bg-red-400 hover:text-background"
          : "bg-background text-primary"
      )}
    >
      {isRecording ? <IconListening /> : <IconMic />}
      <span className="sr-only">New Chat</span>
    </button>
  );
};

export default MicButton;
