"use client";

import Link from "next/link";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { MemoizedReactMarkdown } from "@/components/markdown";
import { CodeBlock } from "@/components/ui/codeblock";
import { ExternalLink } from "@/components/external-link";
import { IconArrowRight } from "@/components/ui/icons";
import {
  RESURRECTION_STORY_MARKDOWN,
  RESURRECTION_STORY_SUBTITLE,
  RESURRECTION_STORY_TITLE,
} from "@/content/resurrection-story";

export default function ResurrectionPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <article className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <header className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconArrowRight className="mr-1 h-3 w-3 rotate-180" />
            back to the chat
          </Link>
          <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
            {RESURRECTION_STORY_TITLE}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {RESURRECTION_STORY_SUBTITLE}
          </p>
        </header>

        <MemoizedReactMarkdown
          className="prose prose-neutral dark:prose-invert max-w-none break-words prose-headings:mt-10 prose-headings:mb-4 prose-p:leading-relaxed prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none prose-img:my-0"
          remarkPlugins={[remarkGfm, remarkMath]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              if (inline) {
                return (
                  <code
                    className="rounded bg-muted px-1 py-[0.1rem] text-[0.92em] font-mono"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <CodeBlock
                  key={Math.random()}
                  language={(match && match[1]) || ""}
                  value={String(children).replace(/\n$/, "")}
                  {...props}
                />
              );
            },
            // Render stand-alone markdown images as <figure>s with the alt
            // text used as a caption. react-markdown wraps every image in a
            // <p>, which would violate the prose's `p-in-p` rules and look
            // wrong here — return a fragment from `p` when the only child is
            // an image so the figure can sit at block level.
            p({ node, children, ...props }) {
              const firstChild = node?.children?.[0];
              const onlyChildIsImage =
                node?.children?.length === 1 &&
                firstChild?.type === "element" &&
                (firstChild as { tagName?: string })?.tagName === "img";
              if (onlyChildIsImage) {
                return <>{children}</>;
              }
              return <p {...props}>{children}</p>;
            },
            img({ src, alt }) {
              if (!src) return null;
              return (
                <figure className="my-10 flex flex-col items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={alt || ""}
                    loading="lazy"
                    className="w-full rounded-lg border bg-muted/30 shadow-sm max-w-xl"
                  />
                  {alt ? (
                    <figcaption className="text-sm text-muted-foreground max-w-xl text-center leading-relaxed">
                      {alt}
                    </figcaption>
                  ) : null}
                </figure>
              );
            },
          }}
        >
          {RESURRECTION_STORY_MARKDOWN}
        </MemoizedReactMarkdown>

        <footer className="mt-16 border-t pt-6 text-sm text-muted-foreground">
          <p>
            The chat this piece describes is running at{" "}
            <Link href="/" className="underline underline-offset-2">
              the root of this site
            </Link>
            . The code is on{" "}
            <ExternalLink href="https://github.com/hrishioa/wasm-ai">
              GitHub
            </ExternalLink>
            , and the resurrected Dolphin 2.2.1 weights themselves live at{" "}
            <ExternalLink href="https://huggingface.co/hrishioa/Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC">
              hrishioa/Dolphin-2.2.1-Mistral-7B-q4f32_1-MLC
            </ExternalLink>
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
