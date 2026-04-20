"use client";

import { useEffect, useRef, useState } from "react";
import { GlassBubble } from "./GlassBubble";
import { DisplaySettings } from "./DisplaySettings";
import { ReadingSettings } from "./ReadingSettings";
import { AudioSettings } from "./AudioSettings";
import { TocPanel } from "./TocPanel";
import { useOpenableState } from "@/hooks/useOpenableState";
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
import type { ChapterMeta } from "@/content/chapters";

export type PartMeta = {
  id: string;
  order: number;
  numeral: string;
  title: string;
  matchesChapterPart: string;
};

type ChromeProps = {
  chapterTitle: string;
  chapterSubtitle: string;
  chapters: ChapterMeta[];
  parts: PartMeta[];
  currentId: string;
  onNavigate: (chapterId: string) => void;
};

type SettingsTab = "display" | "reading" | "audio";

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function Chrome({
  chapterTitle,
  chapterSubtitle,
  chapters,
  parts,
  currentId,
  onNavigate,
}: ChromeProps) {
  const isDesktop = useIsDesktop();
  const [visible, setVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("display");
  const [tocOpen, setTocOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const settingsAnim = useOpenableState(settingsOpen, 200);
  const tocAnim = useOpenableState(tocOpen, 250);

  const effectiveVisible =
    isDesktop || visible || settingsOpen || tocOpen;

  useEffect(() => {
    if (isDesktop || settingsOpen || tocOpen) return;
    function onScroll() {
      setVisible(false);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDesktop, settingsOpen, tocOpen]);

  useEffect(() => {
    if (isDesktop || !visible || settingsOpen || tocOpen) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), 4000);
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [visible, settingsOpen, tocOpen, isDesktop]);

  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }
    if (tocOpen) {
      setTocOpen(false);
      return;
    }
    if (isDesktop) return;
    setVisible((v) => !v);
  }

  function toggleSettings() {
    if (settingsOpen) {
      setSettingsOpen(false);
    } else {
      setSettingsOpen(true);
      setSettingsTab("display");
      setTocOpen(false);
      setVisible(true);
    }
  }

  function toggleToc() {
    if (tocOpen) {
      setTocOpen(false);
    } else {
      setTocOpen(true);
      setSettingsOpen(false);
      setVisible(true);
    }
  }

  const topPad = settingsOpen ? "min-h-[500px]" : "min-h-[140px]";

  return (
    <>
      {tocAnim.mounted && (
        <>
          {/* Backdrop — blurs page, clicks close TOC */}
          <div
            aria-hidden="true"
            onClick={() => setTocOpen(false)}
            className="pointer-events-auto fixed inset-0 z-[45] transition-opacity duration-[250ms]"
            style={{
              backdropFilter: "blur(14px) saturate(1.1)",
              WebkitBackdropFilter: "blur(14px) saturate(1.1)",
              background: "color-mix(in srgb, var(--bg) 35%, transparent)",
              opacity: tocAnim.animate ? 1 : 0,
            }}
          />
          {/* Popover capsule — above chrome stage so it anchors under the TOC bubble */}
          <div
            className="pointer-events-none fixed inset-x-0 top-[76px] z-[55] flex justify-center px-4 md:justify-start md:px-8 lg:px-12"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="glass-capsule pointer-events-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-[22px] transition-[opacity,transform] duration-[250ms] ease-out"
              style={{
                maxHeight: "calc(100vh - 100px)",
                opacity: tocAnim.animate ? 1 : 0,
                transform: tocAnim.animate
                  ? "scale(1) translateY(0)"
                  : "scale(0.95) translateY(-8px)",
                transformOrigin: isDesktop ? "top left" : "top center",
              }}
            >
              <TocPanel
                chapters={chapters}
                parts={parts}
                currentId={currentId}
                onNavigate={(id) => {
                  onNavigate(id);
                  setTocOpen(false);
                }}
              />
            </div>
          </div>
        </>
      )}

      {settingsOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSettingsOpen(false)}
          className="pointer-events-auto fixed inset-0 z-[45] transition-opacity duration-200"
          style={{
            backdropFilter: "blur(14px) saturate(1.1)",
            WebkitBackdropFilter: "blur(14px) saturate(1.1)",
            background: "color-mix(in srgb, var(--bg) 35%, transparent)",
            opacity: settingsAnim.animate ? 1 : 0,
          }}
        />
      )}

      <div
        aria-hidden={effectiveVisible ? "false" : "true"}
        className="pointer-events-none fixed inset-0 z-50"
      >
        {/* TOP MASK */}
        <div
          onClick={handleStageClick}
          className={`pointer-events-auto absolute inset-x-0 top-0 ${topPad} mask-top transition-[min-height,opacity] duration-300 ease-out`}
          style={{ opacity: effectiveVisible ? 1 : 0 }}
        >
          <div className="relative flex h-[88px] w-full items-start justify-between px-4 pt-4 md:px-8 md:pt-6 lg:px-12">
            <div className="flex items-center gap-2">
              <GlassBubble
                label={tocOpen ? "Close contents" : "Table of contents"}
                active={tocOpen}
                onClick={toggleToc}
              >
                {tocOpen ? <XIcon /> : <TocIcon />}
              </GlassBubble>
              <GlassBubble
                label={bookmarked ? "Remove bookmark" : "Bookmark this page"}
                dimmed={settingsOpen || tocOpen}
                active={bookmarked}
                onClick={() => setBookmarked((b) => !b)}
              >
                <BookmarkIcon />
              </GlassBubble>
            </div>

            <div className="pointer-events-none absolute left-1/2 top-5 hidden -translate-x-1/2 text-center sm:block md:top-7">
              <div
                className="text-[14px] font-medium leading-tight"
                style={{ color: "var(--ink)" }}
              >
                {chapterTitle}
              </div>
              {chapterSubtitle ? (
                <div
                  className="mt-0.5 text-[12px] italic"
                  style={{ color: "var(--ink-secondary)" }}
                >
                  {chapterSubtitle}
                </div>
              ) : null}
            </div>

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
                onClick={() => {
                  /* AI takeover — future */
                }}
              >
                <SparkleIcon />
              </GlassBubble>
            </div>
          </div>

          {settingsAnim.mounted && (
            <div className="flex w-full justify-center px-4 pb-4 md:justify-end md:px-8 lg:px-12">
              <div
                className="glass-capsule w-full max-w-[420px] overflow-hidden rounded-[22px] transition-[opacity,transform] duration-200 ease-out"
                onClick={(e) => e.stopPropagation()}
                style={{
                  opacity: settingsAnim.animate ? 1 : 0,
                  transform: settingsAnim.animate
                    ? "scale(1) translateY(0)"
                    : "scale(0.95) translateY(-8px)",
                  transformOrigin: isDesktop ? "top right" : "top center",
                }}
              >
                <div
                  className="flex items-center justify-center gap-2 px-3 py-3"
                  style={{ borderBottom: "1px solid var(--card-border)" }}
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
                <div>
                  {settingsTab === "display" && <DisplaySettings />}
                  {settingsTab === "reading" && <ReadingSettings />}
                  {settingsTab === "audio" && <AudioSettings />}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM MASK */}
        <div
          onClick={handleStageClick}
          className="pointer-events-auto absolute inset-x-0 bottom-0 min-h-[90px] mask-bottom transition-opacity duration-300 ease-out"
          style={{ opacity: effectiveVisible ? 1 : 0 }}
        >
          <div className="flex h-[88px] w-full items-end justify-between px-4 pb-4 md:px-8 md:pb-6 lg:px-12">
            <div className="flex items-center gap-2">
              <GlassBubble label="Play narration" size="lg" onClick={() => {}}>
                <PlayIcon />
              </GlassBubble>
            </div>
            <div className="flex items-center gap-2">
              <GlassBubble label="Search" onClick={() => {}}>
                <SearchIcon />
              </GlassBubble>
              <GlassBubble label="Share" onClick={() => {}}>
                <ShareIcon />
              </GlassBubble>
            </div>
          </div>
        </div>
      </div>
    </>
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
      <span className="text-[10px] font-medium uppercase tracking-[0.06em]">
        {label}
      </span>
    </button>
  );
}
