"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReaderView } from "./ReaderView";
import { Chrome } from "./Chrome";
import { RsvpOverlay } from "./RsvpOverlay";
import { PaywallSticky } from "./PaywallSticky";
import { LoginGate } from "./LoginGate";
import { CoverSection } from "./CoverSection";
import { PageTurn } from "./PageTurn";
import { SelectionPopover } from "./SelectionPopover";
import { HighlightsProvider } from "./HighlightsContext";
import { GlossaryProvider } from "./GlossaryContext";
import { FootnoteController } from "./FootnoteController";
import { AuthModal } from "@/components/auth/AuthModal";
import { useReaderSettings } from "./SettingsContext";
import { clientPreviewState } from "@/lib/preview";
import type { ChapterMeta } from "@/content/chapters";
import type { ReaderStream } from "@/content/stream";

type Props = { stream: ReaderStream };

type Anchor = {
  id: string;
  title: string;
  subtitle: string;
};

export function ReaderShell({ stream }: Props) {
  const { purchased, authReady, loggedIn, refreshAccess, readerPosition, scrollMode, rsvpEnabled } = useReaderSettings();
  const [unlockedStream, setUnlockedStream] = useState<ReaderStream | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const activeStream = unlockedStream ?? stream;
  const { nodes, chapters, parts, glossary } = activeStream;
  const [paywallExpanded, setPaywallExpanded] = useState(false);
  const [anyPanelOpen, setAnyPanelOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "license">("license");
  const [purchasePending, setPurchasePending] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const restoredPosition = useRef<string | null>(null);
  // Which content tier we've already fetched, so we re-fetch when the reader
  // moves public → member (login) → full (purchase) but not on every render.
  const fetchedTier = useRef<"member" | "full" | null>(null);

  useEffect(() => {
    // Dev preview: the SSR stream is already the forced tier — don't fetch.
    if (clientPreviewState()) return;
    // public tier is already server-rendered into `stream`; nothing to fetch.
    if (!purchased && !loggedIn) return;
    const tier: "member" | "full" = purchased ? "full" : "member";
    if (fetchedTier.current === tier) return;
    let canceled = false;

    async function unlockContent() {
      setContentError(null);
      try {
        const response = await fetch("/api/content", {
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "content_unavailable");
        }
        if (!canceled) {
          setUnlockedStream(data as ReaderStream);
          fetchedTier.current = tier;
        }
      } catch {
        if (!canceled) {
          setContentError(
            "Your access is active, but the book could not be loaded. Refresh to try again.",
          );
        }
      }
    }

    void unlockContent();
    return () => {
      canceled = true;
    };
  }, [purchased, loggedIn]);

  // `?reset=1` clears local presentation preferences only. Ownership remains
  // server-derived and cannot be reset or granted in browser storage.
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("checkout")) {
      sessionStorage.removeItem("iinb:checkout-request");
    }
    if (url.searchParams.get("checkout") !== "success") return;
    let canceled = false;
    async function reconcile() {
      for (let attempt = 0; attempt < 6 && !canceled; attempt += 1) {
        const access = await refreshAccess().catch(() => null);
        if (access?.entitled) {
          url.searchParams.delete("checkout");
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
      if (!canceled) setPurchaseError("Payment succeeded. Access is still syncing; refresh in a moment.");
    }
    void reconcile();
    return () => { canceled = true; };
  }, [refreshAccess]);

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
    () => chapters.map((chapter) => ({
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      subtitle: chapter.subtitle,
      part: chapter.part,
      isFree: chapter.isFree,
    })),
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

  useEffect(() => {
    if (!purchased || !unlockedStream || !readerPosition?.chapterId) return;
    const key = `${readerPosition.chapterId}:${readerPosition.scrollY ?? "chapter"}`;
    if (restoredPosition.current === key) return;
    restoredPosition.current = key;
    const frame = window.requestAnimationFrame(() => {
      if (Number.isFinite(readerPosition.scrollY)) {
        window.scrollTo({ top: Math.max(0, Number(readerPosition.scrollY)), behavior: "auto" });
      } else {
        document.getElementById(readerPosition.chapterId || "")?.scrollIntoView({ block: "start" });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [purchased, unlockedStream, readerPosition]);

  useEffect(() => {
    if (!purchased || !activeId) return;
    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void fetch("/api/reader-state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ position: { chapterId: activeId, scrollY: Math.round(window.scrollY) } }),
        }).catch(() => null);
      }, 1200);
    };
    save();
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.removeEventListener("scroll", save);
      window.clearTimeout(timer);
    };
  }, [purchased, activeId]);

  const openPaywall = useCallback(() => {
    setPaywallExpanded(true);
    navigateTo("paywall");
  }, [navigateTo]);

  const startPurchase = useCallback(async () => {
    setPurchaseError(null);
    if (!loggedIn) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }
    // Open the checkout tab synchronously inside the click gesture (so the
    // browser doesn't block it), then point it at the Stripe URL once ready.
    const checkoutTab = window.open("", "_blank");
    try {
      let requestKey = sessionStorage.getItem("iinb:checkout-request");
      if (!requestKey) {
        requestKey = crypto.randomUUID();
        sessionStorage.setItem("iinb:checkout-request", requestKey);
      }
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestKey }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 && data.code === "already_entitled") {
        checkoutTab?.close();
        await refreshAccess();
        return;
      }
      if (response.status === 401) {
        checkoutTab?.close();
        setAuthMode("login");
        setAuthOpen(true);
        return;
      }
      if (!response.ok || !data.url) {
        checkoutTab?.close();
        throw new Error(data.error || "Checkout could not be opened.");
      }
      if (checkoutTab) checkoutTab.location.href = data.url;
      else window.open(data.url, "_blank");
    } catch (error) {
      checkoutTab?.close();
      setPurchaseError(error instanceof Error ? error.message : "Checkout could not be opened.");
    } finally {
      setPurchasePending(false);
    }
  }, [loggedIn, refreshAccess]);

  return (
    <HighlightsProvider>
      <GlossaryProvider entries={glossary}>
      <main className="reader-scroll min-h-[100dvh] w-full">
        <CoverSection />
        <ReaderView nodes={nodes} />
        {purchased && !unlockedStream ? (
          <p
            role={contentError ? "alert" : "status"}
            className="mx-auto max-w-[680px] px-6 pb-36 text-center text-sm"
            style={{ color: "var(--ink-secondary)" }}
          >
            {contentError ?? "Opening the full book…"}
          </p>
        ) : null}
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
      {authReady && !purchased && !loggedIn && (
        <LoginGate
          hidden={anyPanelOpen || authOpen}
          onLogin={() => {
            setAuthMode("login");
            setAuthOpen(true);
          }}
        />
      )}
      {authReady && !purchased && loggedIn && (
        <PaywallSticky
          expanded={paywallExpanded}
          onToggle={() => setPaywallExpanded((v) => !v)}
          hidden={anyPanelOpen || authOpen}
          onPurchase={startPurchase}
          purchasePending={purchasePending}
          purchaseError={purchaseError}
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
      <PageTurn
        active={
          scrollMode === "page-turn" &&
          !anyPanelOpen &&
          !authOpen &&
          !(rsvpEnabled && purchased)
        }
      />
      <RsvpOverlay nodes={nodes} />
      <SelectionPopover />
      <FootnoteController />
      </GlossaryProvider>
    </HighlightsProvider>
  );
}
