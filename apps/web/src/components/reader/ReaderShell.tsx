"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReaderView } from "./ReaderView";
import { Chrome } from "./Chrome";
import { RsvpOverlay } from "./RsvpOverlay";
import { PaywallSticky } from "./PaywallSticky";
import { SelectionPopover } from "./SelectionPopover";
import { HighlightsProvider } from "./HighlightsContext";
import { GlossaryProvider } from "./GlossaryContext";
import { FootnoteController } from "./FootnoteController";
import { AuthModal } from "@/components/auth/AuthModal";
import { useReaderSettings } from "./SettingsContext";
import type { ChapterMeta } from "@/content/chapters";
import type { Part } from "@/content/parts";
import type { ReaderStream } from "@/content/stream";

type Props = { stream: ReaderStream };

type Anchor = {
  id: string;
  title: string;
  subtitle: string;
};

export function ReaderShell({ stream }: Props) {
  const { nodes, chapters, parts, glossary } = stream;
  const { purchased } = useReaderSettings();
  const [paywallExpanded, setPaywallExpanded] = useState(false);
  const [anyPanelOpen, setAnyPanelOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "license">("license");

  // Dev test mode: `?reset=1` clears all reader state and reloads clean,
  // so the onboarding flow can be rehearsed repeatedly with
  // IINB-TEST-2026 as the test license.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("reset") === "1") {
      try {
        localStorage.removeItem("iinb:reader-settings:v2");
      } catch {
        /* ignore */
      }
      url.searchParams.delete("reset");
      window.history.replaceState({}, "", url.pathname + url.search);
      window.location.reload();
    }
  }, []);

  // Collapse the paywall whenever a popover opens so the two don't stack.
  useEffect(() => {
    if (anyPanelOpen && paywallExpanded) setPaywallExpanded(false);
  }, [anyPanelOpen, paywallExpanded]);

  const anchors: Anchor[] = useMemo(
    () =>
      nodes.map((n) => {
        if (n.kind === "dedication") {
          return { id: n.dedication.id, title: "", subtitle: "" };
        }
        if (n.kind === "part") {
          return {
            id: n.part.id,
            title: `${n.part.numeral} · ${n.part.title}`,
            subtitle: "",
          };
        }
        return {
          id: n.chapter.id,
          title: n.chapter.title,
          subtitle: n.chapter.subtitle,
        };
      }),
    [nodes],
  );

  const [activeId, setActiveId] = useState<string>(
    () => anchors[0]?.id ?? "",
  );

  const chapterMetas: ChapterMeta[] = useMemo(
    () => chapters.map(({ blocks: _b, isEmpty: _e, ...meta }) => meta),
    [chapters],
  );

  const partMetas = useMemo(
    () =>
      parts.map((p) => ({
        id: p.id,
        order: p.order,
        numeral: p.numeral,
        title: p.title,
        matchesChapterPart: p.matchesChapterPart,
      })),
    [parts],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    function update() {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-chapter-anchor]"),
      );
      if (!els.length) return;
      const threshold = window.scrollY + 140;
      let best: HTMLElement = els[0];
      for (const el of els) {
        if (el.offsetTop <= threshold) best = el;
        else break;
      }
      const id = best.dataset.chapterAnchor;
      if (id) setActiveId((prev) => (prev === id ? prev : id));
    }
    update();
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [anchors.length]);

  const active = anchors.find((a) => a.id === activeId) ?? anchors[0];

  const navigateTo = useCallback((id: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-chapter-anchor="${CSS.escape(id)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const navigateParagraph = useCallback((anchor: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-p-anchor="${CSS.escape(anchor)}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const openPaywall = useCallback(() => {
    setPaywallExpanded(true);
    navigateTo("paywall");
  }, [navigateTo]);

  return (
    <HighlightsProvider>
      <GlossaryProvider entries={glossary}>
      <main className="reader-scroll min-h-[100dvh] w-full">
        <ReaderView nodes={nodes} />
      </main>
      <Chrome
        chapterTitle={active?.title ?? ""}
        chapterSubtitle={active?.subtitle ?? ""}
        chapters={chapterMetas}
        searchableChapters={chapters}
        parts={partMetas}
        glossary={glossary}
        currentId={activeId}
        onNavigate={navigateTo}
        onNavigateParagraph={navigateParagraph}
        onOpenPaywall={openPaywall}
        onPanelStateChange={setAnyPanelOpen}
      />
      {!purchased && (
        <PaywallSticky
          expanded={paywallExpanded}
          onToggle={() => setPaywallExpanded((v) => !v)}
          hidden={anyPanelOpen || authOpen}
          onOpenLicense={() => {
            setAuthMode("license");
            setAuthOpen(true);
          }}
        />
      )}
      <AuthModal
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
      <RsvpOverlay nodes={nodes} />
      <SelectionPopover />
      <FootnoteController />
      </GlossaryProvider>
    </HighlightsProvider>
  );
}
