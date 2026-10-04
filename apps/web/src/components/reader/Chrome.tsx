"use client";

import { useEffect, useMemo, useState } from "react";
import { GlassBubble } from "./GlassBubble";
import { DisplaySettings } from "./DisplaySettings";
import { PillTabs } from "./PillTabs";
import { ChapterProgress } from "./ChapterProgress";
import { ReadingSettings } from "./ReadingSettings";
import { AudioSettings } from "./AudioSettings";
import { TocPanel } from "./TocPanel";
import { SearchPanel } from "./SearchPanel";
import { AiPanel } from "./AiPanel";
import { ShareMenu } from "./ShareMenu";
import { PaywallProvider } from "./PaywallContext";
import { useOpenableState } from "@/hooks/useOpenableState";
import { COMING_SOON } from "@/lib/comingSoon";
import { useReaderSettings } from "./SettingsContext";
import type { Chapter } from "@/content/chapters";
import {
  GearIcon,
  PlayIcon,
  SearchIcon,
  ShareIcon,
  SparkleIcon,
  TocIcon,
  XIcon,
} from "./icons";
import type { ChapterMeta } from "@/content/chapters";
import type { GlossaryEntry } from "@/content/glossary";

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
  searchableChapters: Chapter[];
  parts: PartMeta[];
  glossary: GlossaryEntry[];
  currentId: string;
  onNavigate: (chapterId: string) => void;
  onNavigateParagraph: (anchor: string) => void;
  onOpenPaywall: () => void;
  onPanelStateChange?: (anyOpen: boolean) => void;
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
  searchableChapters,
  parts,
  glossary,
  currentId,
  onNavigate,
  onNavigateParagraph,
  onOpenPaywall,
  onPanelStateChange,
}: ChromeProps) {
  const isDesktop = useIsDesktop();
  const { purchased } = useReaderSettings();
  const [visible, setVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("display");
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  /** Toggled by the sparkle bubble / ⌘K. Real AI panel TBD. */
  const [aiOpen, setAiOpen] = useState(false);
  /** Toggled by the play bubble / ⌘L. Real audio engine TBD. */
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  /** Passage the reader selected and chose "Ask" on (SelectionPopover). */
  const [askQuote, setAskQuote] = useState<string | null>(null);

  const paywallValue = useMemo(
    () => ({
      openPaywall: () => {
        setSettingsOpen(false);
        setTocOpen(false);
        setSearchOpen(false);
        onOpenPaywall();
      },
    }),
    [onOpenPaywall],
  );

  const settingsAnim = useOpenableState(settingsOpen, 200);
  const tocAnim = useOpenableState(tocOpen, 250);
  const searchAnim = useOpenableState(searchOpen, 220);
  const bookmarksAnim = useOpenableState(bookmarksOpen, 250);
  const aiAnim = useOpenableState(aiOpen, 240);
  const shareAnim = useOpenableState(shareOpen, 220);
  const anyPanelOpen =
    settingsOpen || tocOpen || searchOpen || bookmarksOpen || aiOpen || shareOpen;
  const anyPanelMounted =
    settingsAnim.mounted ||
    tocAnim.mounted ||
    searchAnim.mounted ||
    bookmarksAnim.mounted ||
    aiAnim.mounted ||
    shareAnim.mounted;
  const anyPanelAnimating =
    settingsAnim.animate ||
    tocAnim.animate ||
    searchAnim.animate ||
    bookmarksAnim.animate ||
    aiAnim.animate ||
    shareAnim.animate;

  const effectiveVisible = visible || anyPanelOpen;

  useEffect(() => {
    onPanelStateChange?.(anyPanelOpen);
  }, [anyPanelOpen, onPanelStateChange]);

  // Lock the page behind open panels (wheel/trackpad over a panel used to
  // scroll the book underneath).
  useEffect(() => {
    const root = document.documentElement;
    if (anyPanelOpen) root.setAttribute("data-reader-panel-open", "");
    else root.removeAttribute("data-reader-panel-open");
    return () => root.removeAttribute("data-reader-panel-open");
  }, [anyPanelOpen]);

  // Reader-wide keyboard shortcuts. ⌘F / ⌘K / ⌘L preempt the browser
  // defaults so the in-app versions fire instead.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape always closes, even from inside a panel's text field.
      if (e.key === "Escape") {
        if (anyPanelOpen) closeAllPanels();
        if (audioPlaying) setAudioPlaying(false);
        return;
      }
      // Skip when focus is inside a form field so the user can still type.
      const target = e.target as HTMLElement | null;
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true']",
        )
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (mod && k === "f") {
        e.preventDefault();
        if (searchOpen) setSearchOpen(false);
        else openOnly("search");
      } else if (mod && k === "k") {
        e.preventDefault();
        if (COMING_SOON.ai) return;
        if (!purchased) {
          onOpenPaywall();
          return;
        }
        if (aiOpen) setAiOpen(false);
        else openOnly("ai");
      } else if (mod && k === "l") {
        e.preventDefault();
        if (COMING_SOON.audio) return;
        if (!purchased) {
          onOpenPaywall();
          return;
        }
        setAudioPlaying((v) => !v);
        setVisible(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // purchased/onOpenPaywall were missing here, so ⌘K/⌘L kept the
    // pre-login `purchased=false` and sent paying readers to the paywall.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchOpen, anyPanelOpen, aiOpen, audioPlaying, purchased, onOpenPaywall]);

  // "Ask" from the selection popover: open Ask the book about that passage.
  useEffect(() => {
    function onAskAbout(e: Event) {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text?.trim();
      if (!text || COMING_SOON.ai) return;
      if (!purchased) {
        onOpenPaywall();
        return;
      }
      setAskQuote(text.length > 1200 ? `${text.slice(0, 1200)}…` : text);
      openOnly("ai");
    }
    window.addEventListener("iinb:ask-about", onAskAbout);
    return () => window.removeEventListener("iinb:ask-about", onAskAbout);
    // openOnly only calls state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchased, onOpenPaywall]);

  // Tap-to-reveal: tapping anywhere in the reading area toggles the chrome.
  // Skips interactive affordances, open panels, and active text selections.
  useEffect(() => {
    function onTap(e: MouseEvent) {
      if (anyPanelOpen) return; // panels handle their own dismissal
      const t = e.target as HTMLElement | null;
      if (
        !t ||
        t.closest(
          "button, a, input, textarea, select, [role='button'], .glass-bubble, .footnote-ref, .footnote-close, .gloss-term, .page-turn-edge, .login-gate",
        )
      ) {
        return;
      }
      const sel = window.getSelection();
      if (sel && sel.type === "Range" && !sel.isCollapsed) return;
      setVisible((v) => !v);
    }
    document.addEventListener("click", onTap);
    return () => document.removeEventListener("click", onTap);
  }, [anyPanelOpen]);

  // Keep the global site header in lockstep with the reader chrome. The header
  // exposes an `.is-hidden` class on its host that runs its own slide-away
  // animation; driving it from the reader's visibility means the sidebar button
  // hides on tap (not just scroll) and enters/exits together with the rest.
  useEffect(() => {
    const hdr = document.querySelector("ywe-header");
    if (!hdr) return;
    hdr.classList.toggle("is-hidden", !effectiveVisible);
    return () => hdr.classList.remove("is-hidden");
  }, [effectiveVisible]);

  type Panel = "settings" | "toc" | "search" | "bookmarks" | "ai" | "share";
  function openOnly(panel: Panel) {
    setSettingsOpen(panel === "settings");
    setTocOpen(panel === "toc");
    setSearchOpen(panel === "search");
    setBookmarksOpen(panel === "bookmarks");
    setAiOpen(panel === "ai");
    setShareOpen(panel === "share");
    setVisible(true);
  }

  function closeAllPanels() {
    setSettingsOpen(false);
    setTocOpen(false);
    setSearchOpen(false);
    setBookmarksOpen(false);
    setAiOpen(false);
    setShareOpen(false);
  }

  function toggleShare() {
    if (shareOpen) setShareOpen(false);
    else openOnly("share");
  }

  function toggleAi() {
    if (aiOpen) setAiOpen(false);
    else openOnly("ai");
  }

  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (anyPanelOpen) closeAllPanels();
    // Visibility toggling is handled globally by the tap-to-reveal effect
    // below so it works anywhere on the page, not just on the mask strips.
  }

  function toggleSettings() {
    if (settingsOpen) {
      setSettingsOpen(false);
    } else {
      openOnly("settings");
      setSettingsTab("display");
    }
  }

  function toggleToc() {
    if (tocOpen) setTocOpen(false);
    else openOnly("toc");
  }

  function toggleSearch() {
    if (searchOpen) setSearchOpen(false);
    else openOnly("search");
  }

  return (
    <PaywallProvider value={paywallValue}>
      {/* Shared backdrop — blurs page when either TOC or Settings is open,
          and closes on click so anywhere-outside dismisses the panel. */}
      {anyPanelMounted && (
        <div
          aria-hidden="true"
          onClick={closeAllPanels}
          className="pointer-events-auto fixed inset-0 z-[45] transition-opacity duration-[220ms]"
          style={{
            // Plain scrim: a live blur over the full-book page made every
            // panel open/close stutter.
            background: "color-mix(in srgb, var(--ink) 14%, transparent)",
            opacity: anyPanelAnimating ? 1 : 0,
          }}
        />
      )}

      {/* TOC popover — anchored top-left on desktop, centered on mobile */}
      {tocAnim.mounted && (
        <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[55] flex justify-center px-4 md:justify-start md:px-8 lg:px-12">
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-capsule pointer-events-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-[22px] transition-[opacity,transform] duration-[220ms] ease-out"
            style={{
              maxHeight: "55dvh",
              opacity: tocAnim.animate ? 1 : 0,
              transform: tocAnim.animate
                ? "scale(1) translateY(0)"
                : "scale(0.95) translateY(-8px)",
              transformOrigin: isDesktop ? "top left" : "top center",
            }}
          >
            <TocPanel
              onClose={() => setTocOpen(false)}
              chapters={chapters}
              parts={parts}
              glossary={glossary}
              currentId={currentId}
              onNavigate={(id) => {
                onNavigate(id);
                setTocOpen(false);
              }}
              onOpenPaywall={() => {
                onOpenPaywall();
                setTocOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {shareAnim.mounted && (
        <ShareMenu
          animate={shareAnim.animate}
          isDesktop={isDesktop}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Ask (AI) popover — anchored top-right on desktop, centered on mobile */}
      {aiAnim.mounted && (
        <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[55] flex justify-center px-4 md:justify-end md:px-8 lg:px-12">
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-capsule pointer-events-auto flex w-full max-w-[480px] flex-col overflow-hidden rounded-[22px] transition-[opacity,transform] duration-[220ms] ease-out"
            style={{
              height: "min(calc(100dvh - 140px), 640px)",
              opacity: aiAnim.animate ? 1 : 0,
              transform: aiAnim.animate
                ? "scale(1) translateY(0)"
                : "scale(0.95) translateY(-8px)",
              transformOrigin: isDesktop ? "top right" : "top center",
            }}
          >
            <AiPanel
              chapterId={currentId}
              chapterTitle={chapterTitle}
              quote={askQuote}
              onClearQuote={() => setAskQuote(null)}
              onClose={() => setAiOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Search popover — anchored bottom-right on desktop, centered on mobile */}
      {searchAnim.mounted && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-[55] flex justify-center px-4 md:justify-end md:px-8 lg:px-12">
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-capsule pointer-events-auto flex w-full max-w-[440px] flex-col overflow-hidden rounded-[22px] transition-[opacity,transform] duration-[220ms] ease-out"
            style={{
              maxHeight: "55dvh",
              opacity: searchAnim.animate ? 1 : 0,
              transform: searchAnim.animate
                ? "scale(1) translateY(0)"
                : "scale(0.95) translateY(8px)",
              transformOrigin: isDesktop ? "bottom right" : "bottom center",
            }}
          >
            <SearchPanel
              chapters={searchableChapters}
              onNavigate={(anchor) => {
                onNavigateParagraph(anchor);
                setSearchOpen(false);
              }}
              onClose={() => setSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Settings popover — anchored top-right on desktop, centered on mobile */}
      {settingsAnim.mounted && (
        <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[55] flex justify-center px-4 md:justify-end md:px-8 lg:px-12">
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-capsule pointer-events-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-[22px] transition-[opacity,transform] duration-[200ms] ease-out"
            style={{
              maxHeight: "calc(100dvh - 120px)",
              opacity: settingsAnim.animate ? 1 : 0,
              transform: settingsAnim.animate
                ? "scale(1) translateY(0)"
                : "scale(0.95) translateY(-8px)",
              transformOrigin: isDesktop ? "top right" : "top center",
            }}
          >
            <div className="px-4 pb-2 pt-4">
              <PillTabs
                label="Settings"
                active={settingsTab}
                onChange={setSettingsTab}
                tabs={[
                  { id: "display", label: "Display" },
                  { id: "reading", label: "Reading" },
                  { id: "audio", label: "Audio" },
                ]}
              />
            </div>
            <div className="overflow-y-auto">
              {settingsTab === "display" && <DisplaySettings />}
              {settingsTab === "reading" && <ReadingSettings />}
              {settingsTab === "audio" && <AudioSettings />}
            </div>
          </div>
        </div>
      )}

      {/* Chrome stage — only bubbles + mask gradients now; panels live
          outside of it as proper sibling popovers. */}
      <div
        aria-hidden={effectiveVisible ? "false" : "true"}
        className="pointer-events-none fixed inset-0 z-50"
      >
        {/* TOP MASK */}
        <div
          onClick={handleStageClick}
          className="pointer-events-auto absolute inset-x-0 top-0 min-h-[140px] mask-top"
          style={{
            opacity: effectiveVisible ? 1 : 0,
            transform: effectiveVisible ? "translateY(0)" : "translateY(-90px)",
            // Same distance, durations and curves as <ywe-header>'s .is-hidden
            // slide, so the sidebar button and the reader controls move as one.
            transition: chromeTransition(),
          }}
        >
          <div
            onClick={(e) => {
              // Empty space in the bubble row should also close panels.
              if (e.target === e.currentTarget && anyPanelOpen) {
                closeAllPanels();
              }
            }}
            className="relative flex h-[88px] w-full items-start justify-between pl-[64px] pr-4 pt-4 md:pl-[74px] md:pr-8 md:pt-6 lg:pl-[74px] lg:pr-12"
          >
            <div className="flex items-center gap-2">
              <GlassBubble
                label={tocOpen ? "Close contents" : "Table of contents"}
                active={tocOpen}
                onClick={toggleToc}
              >
                {tocOpen ? <XIcon /> : <TocIcon />}
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
                label={
                  COMING_SOON.ai
                    ? "Ask the book — coming soon"
                    : !purchased
                      ? "Ask the book — premium"
                      : aiOpen
                        ? "Close ask"
                        : "Ask the book (⌘K)"
                }
                active={aiOpen && !COMING_SOON.ai}
                locked={COMING_SOON.ai || !purchased}
                onClick={() => {
                  if (COMING_SOON.ai) return;
                  if (purchased) toggleAi();
                  else onOpenPaywall();
                }}
              >
                {aiOpen ? <XIcon /> : <SparkleIcon />}
              </GlassBubble>
            </div>
          </div>
        </div>

        {/* BOTTOM MASK — only show the gradient fade when the paywall is
            NOT active (paywall handles its own fade). Bubbles always visible. */}
        <div
          onClick={handleStageClick}
          className="pointer-events-auto absolute inset-x-0 bottom-0 min-h-[90px] mask-bottom"
          style={{
            opacity: effectiveVisible ? 1 : 0,
            transform: effectiveVisible ? "translateY(0)" : "translateY(90px)",
            transition: chromeTransition(),
          }}
        >
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && anyPanelOpen) {
                closeAllPanels();
              }
            }}
            className="relative flex h-[88px] w-full items-end justify-between px-4 pb-4 md:px-8 md:pb-6 lg:px-12"
          >
            {/* Free readers have the sign-in / paywall bar in this spot. */}
            {purchased ? (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:bottom-6">
                <ChapterProgress
                  currentId={currentId}
                  purchased={purchased}
                  onLocked={onOpenPaywall}
                />
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <GlassBubble
                label={
                  COMING_SOON.audio
                    ? "Narration — coming soon"
                    : !purchased
                      ? "Narration — premium"
                      : audioPlaying
                        ? "Pause narration (⌘L)"
                        : "Play narration (⌘L)"
                }
                size="lg"
                active={audioPlaying && purchased && !COMING_SOON.audio}
                locked={COMING_SOON.audio || !purchased}
                dimmed={anyPanelOpen}
                onClick={() => {
                  if (COMING_SOON.audio) return;
                  if (purchased) setAudioPlaying((v) => !v);
                  else onOpenPaywall();
                }}
              >
                <PlayIcon />
              </GlassBubble>
            </div>
            <div className="flex items-center gap-2">
              <GlassBubble
                label={searchOpen ? "Close search" : "Search"}
                active={searchOpen}
                dimmed={settingsOpen || tocOpen}
                onClick={toggleSearch}
              >
                {searchOpen ? <XIcon /> : <SearchIcon />}
              </GlassBubble>
              <GlassBubble
                label={shareOpen ? "Close share" : "Share"}
                active={shareOpen}
                dimmed={anyPanelOpen && !shareOpen}
                onClick={toggleShare}
              >
                <ShareIcon />
              </GlassBubble>
            </div>
          </div>
        </div>
      </div>
    </PaywallProvider>
  );
}

// Tap-to-reveal motion, shared with <ywe-header> via HeaderTuning so the
// sidebar button and the reader controls move as one. A fast-start curve in
// both directions: the header's own ease-in reveal sat nearly still for the
// first ~100ms after a tap, which read as lag.
export const CHROME_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
function chromeTransition() {
  return `transform 260ms ${CHROME_EASE}, opacity 180ms ${CHROME_EASE}`;
}
