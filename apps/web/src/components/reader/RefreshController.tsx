"use client";

import { useEffect, useRef } from "react";
import { aiErrorMessage } from "./AiPanel";
import { useReaderSettings } from "./SettingsContext";

// "New example" refreshes for author-marked spans ({{ … }} in the manuscript,
// rendered as .refresh-span + a ↻ .refresh-btn by content/chapters.ts).
//
// Event delegation on the prose, like FootnoteController: the paragraphs are
// static HTML, so the swap happens in the DOM. The model always receives the
// WHOLE paragraph with the author's original span in place, so each new
// example is written to fit the sentences around it; only the span changes.
export function RefreshController({
  onSignIn,
  onPaywall,
}: {
  onSignIn: () => void;
  onPaywall: () => void;
}) {
  const { purchased, loggedIn, refreshProfile } = useReaderSettings();
  const state = useRef({ purchased, loggedIn, refreshProfile, onSignIn, onPaywall });
  useEffect(() => {
    state.current = { purchased, loggedIn, refreshProfile, onSignIn, onPaywall };
  }, [purchased, loggedIn, refreshProfile, onSignIn, onPaywall]);

  useEffect(() => {
    const inflight = new Map<HTMLElement, AbortController>();

    async function refresh(span: HTMLElement, btn: HTMLElement) {
      const s = state.current;
      if (!s.loggedIn) return s.onSignIn();
      if (!s.purchased) return s.onPaywall();
      if (inflight.has(span)) return;

      if (span.dataset.originalHtml === undefined) {
        span.dataset.originalHtml = span.innerHTML;
        span.dataset.originalText = span.textContent ?? "";
      }
      const original = span.dataset.originalText ?? "";
      const paragraph = paragraphContext(span, original);
      if (!paragraph) return;

      const controller = new AbortController();
      inflight.set(span, controller);
      span.classList.add("is-loading");
      btn.setAttribute("aria-busy", "true");
      clearError(btn);
      try {
        const res = await fetch("/api/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify({ paragraph, span: original, profile: s.refreshProfile }),
        });
        const data = (await res.json().catch(() => ({}))) as { rewrite?: string; error?: string };
        const rewrite = data.rewrite?.trim();
        if (res.status === 401) return state.current.onSignIn();
        if (res.status === 403) return state.current.onPaywall();
        if (!res.ok || !rewrite) {
          showError(btn, aiErrorMessage(res.status, data.error));
          return;
        }
        span.textContent = rewrite;
        span.classList.add("is-refreshed");
        span.setAttribute("title", `Original: ${original}`);
        ensureOriginalButton(btn);
      } catch {
        if (!controller.signal.aborted) {
          showError(btn, "Couldn't reach the server. Check your connection and try again.");
        }
      } finally {
        inflight.delete(span);
        span.classList.remove("is-loading");
        btn.removeAttribute("aria-busy");
      }
    }

    function revert(span: HTMLElement, originalBtn: HTMLElement) {
      if (span.dataset.originalHtml !== undefined) span.innerHTML = span.dataset.originalHtml;
      span.classList.remove("is-refreshed");
      span.removeAttribute("title");
      originalBtn.remove();
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      const btn = target?.closest<HTMLElement>("[data-refresh-btn]");
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        const span = btn.previousElementSibling as HTMLElement | null;
        if (span?.matches("[data-refresh-span]")) void refresh(span, btn);
        return;
      }
      const orig = target?.closest<HTMLElement>("[data-refresh-original]");
      if (orig) {
        e.preventDefault();
        e.stopPropagation();
        const span = orig.previousElementSibling?.previousElementSibling as HTMLElement | null;
        if (span?.matches("[data-refresh-span]")) revert(span, orig);
      }
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      inflight.forEach((c) => c.abort());
    };
  }, []);

  return null;
}

// Plain text of the whole paragraph with the ORIGINAL span in place and
// reader-UI text (footnote bodies, ↻ buttons, error notes) removed.
function paragraphContext(span: HTMLElement, original: string): string {
  const para = span.closest<HTMLElement>("[data-p-anchor]");
  if (!para) return "";
  const clone = para.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll(".footnote-ref, .footnote-text, .refresh-btn, .refresh-original, .refresh-error")
    .forEach((n) => n.remove());
  const spans = Array.from(para.querySelectorAll("[data-refresh-span]"));
  const cloneSpans = Array.from(clone.querySelectorAll<HTMLElement>("[data-refresh-span]"));
  cloneSpans.forEach((s, i) => {
    const live = spans[i] as HTMLElement | undefined;
    s.textContent = live === span ? original : live?.dataset.originalText ?? s.textContent;
  });
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

function ensureOriginalButton(btn: HTMLElement) {
  if (btn.nextElementSibling?.matches("[data-refresh-original]")) return;
  const orig = document.createElement("button");
  orig.type = "button";
  orig.className = "refresh-original";
  orig.dataset.refreshOriginal = "";
  orig.textContent = "Original";
  orig.setAttribute("aria-label", "Show the original example");
  btn.after(orig);
}

function showError(btn: HTMLElement, message: string) {
  clearError(btn);
  const note = document.createElement("span");
  note.className = "refresh-error";
  note.setAttribute("role", "status");
  note.textContent = message;
  (btn.nextElementSibling?.matches("[data-refresh-original]") ? btn.nextElementSibling : btn).after(note);
  window.setTimeout(() => note.remove(), 6000);
}

function clearError(btn: HTMLElement) {
  btn.parentElement?.querySelectorAll(".refresh-error").forEach((n) => n.remove());
}
