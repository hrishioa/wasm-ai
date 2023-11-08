import Image from "next/image";
import { Chat } from "@/components/chat";
import { Providers } from "../components/providers";

export default function Home() {
  return (
          <Chat
            id="empty"
            initialMessages={
              [
                // {
                //   id: '1',
                //   content: 'Hello',
                //   role: 'user'
                // },
                // {
                //   id: '2',
                //   content: 'There',
                //   role: 'assistant'
                // }
              ]
            }
          />
  );
}
