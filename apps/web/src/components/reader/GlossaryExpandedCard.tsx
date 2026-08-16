"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GlossaryEntry } from "@/content/glossary";
import { RefreshIcon, SpeakerIcon } from "./icons";
import { useReaderSettings } from "./SettingsContext";
import { COMING_SOON } from "@/lib/comingSoon";

const TYPE_INTERVAL = 18;

type Props = {
  entry: GlossaryEntry;
  entries: GlossaryEntry[];
  onSwitchTo: (term: string) => void;
};

function useTypedText(initial: string) {
  const [text, setText] = useState(initial);
  const [typing, setTyping] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  // Keep in sync with initial changes (term switch) unless mid-typing.
  useEffect(() => {
    if (!typing) setText(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const play = useCallback((target: string) => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setText("");
    setTyping(true);
    let i = 0;
    timerRef.current = window.setInterval(() => {
      if (i >= target.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setTyping(false);
        return;
      }
      i++;
      setText(target.slice(0, i));
    }, TYPE_INTERVAL);
  }, []);

  return { text, typing, play };
}

export function GlossaryExpandedCard({ entry, entries, onSwitchTo }: Props) {
  const { purchased } = useReaderSettings();
  const definition = useTypedText(entry.definition);
  const example = useTypedText(
    entry.example ?? entry.used_in_sentence ?? "",
  );
  const [spinningDef, setSpinningDef] = useState(false);
  const [spinningEx, setSpinningEx] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(entry.display || entry.term);
    u.rate = 0.85;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  }

  async function refresh(kind: "definition" | "example") {
    if (kind === "definition") setSpinningDef(true);
    else setSpinningEx(true);
    try {
      const res = await fetch("/api/glossary/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term: entry.term,
          display: entry.display,
          language: entry.lang,
          pronunciation: entry.pronunciation,
          kind,
        }),
      });
      const data = (await res.json()) as { text?: string };
      const next = data.text?.trim();
      if (!next) return;
      if (kind === "definition") definition.play(next);
      else example.play(next);
    } catch {
      // ignore — leave current text
    } finally {
      if (kind === "definition") setSpinningDef(false);
      else setSpinningEx(false);
    }
  }

  const also = entry.also_see
    .map((t) => entries.find((e) => e.term.toLowerCase() === t.toLowerCase()))
    .filter((e): e is GlossaryEntry => !!e);

  return (
    <div
      className="gloss-expanded mt-2 rounded-xl px-3 py-3"
      style={{
        border: "1.5px solid var(--accent)",
        background: "color-mix(in srgb, var(--accent) 5%, var(--bg-soft))",
      }}
    >
      {/* Pronounce */}
      <section className="flex flex-col gap-1.5">
        <SectionLabel>Pronounce</SectionLabel>
        <div className="flex items-center gap-2">
          <span
            className="text-[14px]"
            style={{
              color: "var(--ink)",
              fontFamily:
                "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
            }}
          >
            {entry.pronunciation}
          </span>
          <button
            type="button"
            onClick={speak}
            aria-label="Play pronunciation"
            title="Play pronunciation"
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
            style={{
              color: "var(--accent-ink)",
              background: "var(--accent-soft)",
            }}
          >
            <SpeakerIcon size={14} />
          </button>
        </div>
      </section>

      <Divider />

      {/* Definition */}
      <section className="flex flex-col gap-1.5">
        <SectionLabel>Definition</SectionLabel>
        <p
          className="text-[14px] leading-snug"
          style={{
            color: "var(--ink)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          }}
        >
          {definition.text}
          {purchased && !COMING_SOON.rewrites ? (
            <InlineRefresh
              onClick={() => refresh("definition")}
              spinning={spinningDef}
              disabled={definition.typing}
            />
          ) : null}
        </p>
      </section>

      <Divider />

      {/* In context */}
      <section className="flex flex-col gap-1.5">
        <SectionLabel>In Context</SectionLabel>
        <p
          className="text-[14px] leading-snug italic"
          style={{
            color: "var(--ink-secondary)",
            fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
          }}
        >
          {example.text || "—"}
          {example.text && purchased && !COMING_SOON.rewrites ? (
            <InlineRefresh
              onClick={() => refresh("example")}
              spinning={spinningEx}
              disabled={example.typing}
            />
          ) : null}
        </p>
      </section>

      {also.length > 0 && (
        <>
          <Divider />
          <section className="flex flex-col gap-1.5">
            <SectionLabel>See Also</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {also.map((a) => (
                <button
                  key={a.term}
                  type="button"
                  onClick={() => onSwitchTo(a.term)}
                  className="rounded-full px-2.5 py-1 text-[11px] transition-colors"
                  style={{
                    color: "var(--accent-ink)",
                    background: "var(--accent-soft)",
                    border:
                      "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                    fontFamily:
                      "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  {a.display}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-medium uppercase tracking-[0.14em]"
      style={{ color: "var(--ink-tertiary)" }}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <div
      className="my-3 h-px w-full"
      style={{
        background:
          "color-mix(in srgb, var(--ink-tertiary) 18%, transparent)",
      }}
    />
  );
}

function InlineRefresh({
  onClick,
  spinning,
  disabled,
}: {
  onClick: () => void;
  spinning: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Refresh"
      title="Rewrite"
      className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full align-middle transition-colors"
      style={{
        color: "var(--accent-ink)",
        background: "var(--accent-soft)",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          animation: spinning ? "iinb-fn-spin 900ms linear infinite" : "none",
        }}
      >
        <RefreshIcon size={12} />
      </span>
    </button>
  );
}
