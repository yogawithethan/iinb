"use client";

import { useEffect, useRef, useState } from "react";
import { GlassBubble } from "./GlassBubble";
import { DisplaySettings } from "./DisplaySettings";
import {
  BookIcon,
  BookmarkIcon,
  GearIcon,
  MusicIcon,
  PlayIcon,
  SearchIcon,
  ShareIcon,
  SparkleIcon,
  SunIcon,
  TocIcon,
  XIcon,
} from "./icons";

type ChromeProps = {
  chapterTitle: string;
  chapterSubtitle: string;
};

type SettingsTab = "display" | "reading" | "audio" | null;

export function Chrome({ chapterTitle, chapterSubtitle }: ChromeProps) {
  const [visible, setVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("display");
  const [bookmarked, setBookmarked] = useState(false);

  const hideTimer = useRef<number | null>(null);

  // Auto-hide chrome after a few seconds of inactivity (mimics the spec's
  // "tap to reveal, scroll to dismiss" feel). Scrolling also dismisses.
  useEffect(() => {
    function onScroll() {
      if (settingsOpen) return;
      setVisible(false);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [settingsOpen]);

  useEffect(() => {
    if (!visible || settingsOpen) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), 4000);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [visible, settingsOpen]);

  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    // Only toggle when clicking the transparent stage, not the bubbles themselves.
    if (e.target !== e.currentTarget) return;
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    setVisible((v) => !v);
  }

  function toggleSettings() {
    if (settingsOpen) {
      setSettingsOpen(false);
    } else {
      setSettingsOpen(true);
      setSettingsTab("display");
      setVisible(true);
    }
  }

  const topPad = settingsOpen ? "min-h-[420px]" : "min-h-[140px]";

  return (
    <div
      aria-hidden={!visible && !settingsOpen ? "true" : "false"}
      className="pointer-events-none fixed inset-0 z-40"
    >
      {/* Tap-stage — covers the whole screen but only receives pointer events
          via the chrome pieces. The top/bottom mask zones accept taps to
          toggle chrome; the middle passes through to the text. */}

      {/* TOP MASK + BUBBLES */}
      <div
        onClick={handleStageClick}
        className={`pointer-events-auto absolute inset-x-0 top-0 ${topPad} mask-top transition-[min-height,opacity] duration-300 ease-out`}
        style={{
          opacity: visible || settingsOpen ? 1 : 0,
        }}
      >
        <div className="relative mx-auto flex h-[88px] max-w-[720px] items-start justify-between px-4 pt-4 md:px-6">
          {/* Top left bubbles */}
          <div className="flex items-center gap-2">
            <GlassBubble
              label="Table of contents"
              dimmed={settingsOpen}
              onClick={() => {
                /* TOC takeover — to be built next */
              }}
            >
              <TocIcon />
            </GlassBubble>
            <GlassBubble
              label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
              dimmed={settingsOpen}
              active={bookmarked}
              onClick={() => setBookmarked((b) => !b)}
            >
              <BookmarkIcon />
            </GlassBubble>
          </div>

          {/* Chapter title center */}
          <div className="pointer-events-none absolute left-1/2 top-5 hidden -translate-x-1/2 text-center sm:block">
            <div
              className="text-[14px] font-medium leading-tight"
              style={{ color: "var(--ink)" }}
            >
              {chapterTitle}
            </div>
            <div
              className="mt-0.5 text-[12px] italic"
              style={{ color: "var(--ink-secondary)" }}
            >
              {chapterSubtitle}
            </div>
          </div>

          {/* Top right bubbles */}
          <div className="flex items-center gap-2">
            <GlassBubble
              label={settingsOpen ? "Close settings" : "Open settings"}
              active={settingsOpen}
              onClick={toggleSettings}
            >
              {settingsOpen ? <XIcon /> : <GearIcon />}
            </GlassBubble>
            <GlassBubble
              label="Ask the book (AI)"
              dimmed={settingsOpen}
              onClick={() => {
                /* AI takeover — future */
              }}
            >
              <SparkleIcon />
            </GlassBubble>
          </div>
        </div>

        {/* Settings capsule (frosted glass container that visually connects
            the gear to the sub-bubbles and panel) */}
        {settingsOpen && (
          <div className="mx-auto max-w-[420px] px-4 pb-4">
            <div className="glass-capsule mx-auto mt-1 overflow-hidden rounded-[22px]">
              {/* Sub-bubble row */}
              <div
                className="flex items-center justify-center gap-2 px-3 py-3"
                style={{
                  borderBottom: "1px solid var(--card-border)",
                }}
              >
                <SubTab
                  label="Display"
                  active={settingsTab === "display"}
                  onClick={() => setSettingsTab("display")}
                  icon={<SunIcon />}
                />
                <SubTab
                  label="Reading"
                  active={settingsTab === "reading"}
                  onClick={() => setSettingsTab("reading")}
                  icon={<BookIcon />}
                />
                <SubTab
                  label="Audio"
                  active={settingsTab === "audio"}
                  onClick={() => setSettingsTab("audio")}
                  icon={<MusicIcon />}
                />
              </div>

              {/* Panel body */}
              <div>
                {settingsTab === "display" && <DisplaySettings />}
                {settingsTab === "reading" && <ComingSoon name="Reading" />}
                {settingsTab === "audio" && <ComingSoon name="Audio" />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM MASK + BUBBLES */}
      <div
        onClick={handleStageClick}
        className="pointer-events-auto absolute inset-x-0 bottom-0 min-h-[90px] mask-bottom transition-opacity duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="mx-auto flex h-[88px] max-w-[720px] items-end justify-between px-4 pb-4 md:px-6">
          <div className="flex items-center gap-2">
            <GlassBubble
              label="Play narration"
              size="lg"
              onClick={() => {
                /* Audio flow — future */
              }}
            >
              <PlayIcon />
            </GlassBubble>
          </div>
          <div className="flex items-center gap-2">
            <GlassBubble
              label="Search"
              onClick={() => {
                /* Search takeover — future */
              }}
            >
              <SearchIcon />
            </GlassBubble>
            <GlassBubble
              label="Share"
              onClick={() => {
                /* Share — future */
              }}
            >
              <ShareIcon />
            </GlassBubble>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubTab({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-all active:scale-95"
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent-ink)" : "var(--ink-secondary)",
        border: active
          ? "1px solid color-mix(in srgb, var(--accent) 30%, transparent)"
          : "1px solid transparent",
      }}
    >
      <span aria-hidden>{icon}</span>
      <span
        className="text-[10px] font-medium uppercase tracking-[0.06em]"
      >
        {label}
      </span>
    </button>
  );
}

function ComingSoon({ name }: { name: string }) {
  return (
    <div
      className="px-4 py-8 text-center text-[13px]"
      style={{ color: "var(--ink-tertiary)" }}
    >
      {name} settings coming soon
    </div>
  );
}
