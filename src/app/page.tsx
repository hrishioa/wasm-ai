'use client';

import { Chat } from "@/components/chat";

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
