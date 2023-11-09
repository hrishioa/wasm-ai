import { UseChatHelpers } from "ai/react";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/external-link";
import { IconArrowRight } from "@/components/ui/icons";

const exampleMessages = [
  {
    heading: "Explain technical concepts",
    message: `How does the soft launch system for a submarine launched missile work? Explain in detail.`,
  },
  {
    heading: "Work with code",
    message: "Explain this code by telling me what it is at a high level, then go down levels of abstraction to make things clearer: \n",
    dynamicDataLoc: '/wasmllm-code.txt'
  },
  {
    heading: "Write something creative",
    message: `Write a good 10 paragraph with a good character following three acts and the hero's journey with this writing prompt: "You died of a stress-induced aneurysm in the middle of your debate class. Now, at the gates of Valhalla, the Norse gods are arguing over whether or not it counted as a battle. Good thing you're very passionate about debating."\n`,
  },
];

export function EmptyScreen({
  setInput,
  welcomeMessage,
}: Pick<UseChatHelpers, "setInput"> & { welcomeMessage: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        <h1 className="mb-2 text-lg font-semibold">{welcomeMessage}</h1>
        <p className="mb-2 leading-normal text-muted-foreground">
          Thanks to{" "}
          <ExternalLink href="https://nextjs.org">Next.js</ExternalLink> for
          making this look so nice.
        </p>
        <p className="leading-normal text-muted-foreground">
          You can start a conversation here or try the following examples:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() =>{
                if(message.dynamicDataLoc)
                  fetch(message.dynamicDataLoc).then((data) => data.text()).then(text => setInput(message.message += '\n'+text))
                else
                  setInput(message.message)}
              }
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
