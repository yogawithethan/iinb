"use client";

import { useEffect } from "react";

// The whole footnote types in (and out) over this fixed duration, regardless
// of length — a long note reveals fast, a short one slower, but both take ~1s.
const DURATION = 1000;

type Active = {
  ref: HTMLElement;
  textSpan: HTMLSpanElement;
  content: HTMLSpanElement;
  cursor: HTMLSpanElement;
  fullText: string;
  closeButton: HTMLElement | null;
  raf: number | null;
  fallback: number | null;
  closing: boolean;
};

export function FootnoteController() {
  useEffect(() => {
    let active: Active | null = null;

    function stopAnim(a: Active) {
      if (a.raf !== null) cancelAnimationFrame(a.raf);
      if (a.fallback !== null) window.clearTimeout(a.fallback);
      a.raf = null;
      a.fallback = null;
    }

    function hardRemove(a: Active | null) {
      if (!a) return;
      stopAnim(a);
      a.textSpan.remove();
      if (active === a) active = null;
    }

    // Reveal a.fullText.slice(0..n) where n sweeps `from`→`to` over DURATION.
    function animate(a: Active, from: number, to: number, done: () => void) {
      stopAnim(a);
      const start = performance.now();
      const tick = (now: number) => {
        if (active !== a) return;
        const p = Math.min(1, (now - start) / DURATION);
        const n = Math.round(from + (to - from) * p);
        a.content.textContent = a.fullText.slice(0, n);
        if (p < 1) {
          a.raf = requestAnimationFrame(tick);
        } else {
          a.raf = null;
          done();
        }
      };
      a.raf = requestAnimationFrame(tick);
      // rAF is throttled in background tabs — force completion if it stalls.
      a.fallback = window.setTimeout(() => {
        if (active !== a) return;
        stopAnim(a);
        a.content.textContent = a.fullText.slice(0, to);
        done();
      }, DURATION + 120);
    }

    function collapse() {
      const a = active;
      if (!a || a.closing) return;
      a.closing = true;
      if (a.closeButton) {
        a.closeButton.remove();
        a.closeButton = null;
      }
      a.textSpan.appendChild(a.cursor);
      const from = (a.content.textContent ?? "").length;
      animate(a, from, 0, () => hardRemove(a));
    }

    function open(ref: HTMLElement) {
      if (active && active.ref === ref && !active.closing) return;
      hardRemove(active);

      const text = ref.dataset.fnText ?? "";
      const fullText = ` ${text}`; // leading space so it flows after the marker

      const textSpan = document.createElement("span");
      textSpan.className = "footnote-text";
      const content = document.createElement("span");
      content.className = "footnote-content";
      textSpan.appendChild(content);
      const cursor = document.createElement("span");
      cursor.className = "footnote-cursor";
      cursor.textContent = "|";
      textSpan.appendChild(cursor);
      ref.after(textSpan);

      const a: Active = {
        ref,
        textSpan,
        content,
        cursor,
        fullText,
        closeButton: null,
        raf: null,
        fallback: null,
        closing: false,
      };
      active = a;

      animate(a, 0, fullText.length, () => {
        a.cursor.remove();
        const close = document.createElement("span");
        close.className = "footnote-close";
        close.textContent = "×";
        close.setAttribute("role", "button");
        close.setAttribute("tabindex", "0");
        close.setAttribute("aria-label", "Collapse footnote");
        a.textSpan.appendChild(close);
        a.closeButton = close;
      });
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest?.(".footnote-close")) {
        e.preventDefault();
        e.stopPropagation();
        collapse();
        return;
      }
      const ref = target.closest?.(".footnote-ref") as HTMLElement | null;
      if (ref) {
        e.preventDefault();
        e.stopPropagation();
        if (active && active.ref === ref && !active.closing) {
          collapse();
        } else {
          open(ref);
        }
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") collapse();
    }

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      hardRemove(active);
    };
  }, []);

  return null;
}
