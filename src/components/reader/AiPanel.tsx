"use client";

import { useEffect, useRef, useState } from "react";
import { SparkleIcon } from "./icons";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTED_PROMPTS = [
  "What is this book about?",
  "What's the water metaphor all about?",
  "Summarize the preface in a paragraph",
];

type Props = {
  chapterTitle?: string;
  onClose: () => void;
};

export function AiPanel({ chapterTitle }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on mount
  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          chapterTitle,
        }),
      });
      const data = (await res.json()) as { text?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text ?? "(no response)",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-ink)",
            }}
          >
            <SparkleIcon size={12} />
          </span>
          <span
            className="text-[13px] font-medium"
            style={{
              color: "var(--ink)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Ask the book
          </span>
        </div>
        {chapterTitle ? (
          <span
            className="truncate text-[10px] uppercase tracking-[0.12em]"
            style={{ color: "var(--ink-tertiary)", maxWidth: 180 }}
            title={chapterTitle}
          >
            {chapterTitle}
          </span>
        ) : null}
      </div>

      {/* Messages / empty state */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyState onSelect={send} loading={loading} />
        ) : (
          <MessagesList messages={messages} loading={loading} />
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 px-3 py-2.5"
        style={{ borderTop: "1px solid var(--card-border)" }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask a question…"
          rows={1}
          disabled={loading}
          className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-[13.5px] outline-none transition-colors"
          style={{
            color: "var(--ink)",
            border: "1px solid var(--pill-border)",
            fontFamily:
              "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            lineHeight: 1.4,
            maxHeight: 100,
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label="Send"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-opacity"
          style={{
            background: input.trim()
              ? "var(--accent)"
              : "color-mix(in srgb, var(--ink-tertiary) 20%, transparent)",
            color: input.trim() ? "#fff" : "var(--ink-tertiary)",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function EmptyState({
  onSelect,
  loading,
}: {
  onSelect: (q: string) => void;
  loading: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent-ink)",
        }}
      >
        <SparkleIcon size={22} />
      </div>
      <p
        className="mb-1 text-[15px] font-medium"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Ask anything
      </p>
      <p
        className="mb-6 text-[12px]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Answers grounded in the actual text.
      </p>
      <div className="flex w-full max-w-[340px] flex-col gap-1.5">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            disabled={loading}
            className="rounded-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_6%,transparent)]"
            style={{
              border: "1px solid var(--pill-border)",
              color: "var(--ink-secondary)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessagesList({
  messages,
  loading,
}: {
  messages: Message[];
  loading: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className="max-w-[88%] rounded-2xl px-3 py-2 text-[13.5px] leading-snug"
              style={
                m.role === "user"
                  ? { background: "var(--accent)", color: "#fff" }
                  : {
                      background: "var(--bg-soft)",
                      color: "var(--ink)",
                      border: "1px solid var(--card-border)",
                    }
              }
            >
              {m.content.split(/\n+/).map((line, li) => (
                <p key={li} className={li > 0 ? "mt-1.5" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className="max-w-[88%] rounded-2xl px-3 py-2 text-[13px]"
              style={{
                background: "var(--bg-soft)",
                color: "var(--ink-tertiary)",
                border: "1px solid var(--card-border)",
              }}
            >
              <span className="iinb-ai-dots inline-flex gap-1">
                <span className="iinb-ai-dot">·</span>
                <span className="iinb-ai-dot">·</span>
                <span className="iinb-ai-dot">·</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .iinb-ai-dot {
          animation: iinb-ai-bounce 1100ms infinite;
          font-weight: 700;
          font-size: 20px;
          line-height: 12px;
        }
        .iinb-ai-dot:nth-child(2) {
          animation-delay: 180ms;
        }
        .iinb-ai-dot:nth-child(3) {
          animation-delay: 360ms;
        }
        @keyframes iinb-ai-bounce {
          0%,
          70%,
          100% {
            opacity: 0.2;
          }
          35% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
