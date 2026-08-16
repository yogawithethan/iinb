"use client";

import { useEffect } from "react";

// Entrance typewriter cadence (ms/char). 20% faster than the original 18.
const CHAR_IN = 14;
// Exit typewriter cadence (ms/char) — faster than the entrance.
const CHAR_OUT = 9;

type Active = {
  ref: HTMLElement;
  textSpan: HTMLSpanElement;
  content: HTMLSpanElement;
  cursor: HTMLSpanElement;
  closeButton: HTMLElement | null;
  typingTimer: number | null;
  closing: boolean;
};

export function FootnoteController() {
  useEffect(() => {
    let active: Active | null = null;

    // Instant teardown — used when opening a different footnote or unmounting.
    function hardRemove(a: Active | null) {
      if (!a) return;
      if (a.typingTimer !== null) window.clearInterval(a.typingTimer);
      a.textSpan.remove();
      if (active === a) active = null;
    }

    // Animated close — type the footnote back out, faster, then remove.
    function collapse() {
      const a = active;
      if (!a || a.closing) return;
      a.closing = true;
      if (a.typingTimer !== null) {
        window.clearInterval(a.typingTimer);
        a.typingTimer = null;
      }
      if (a.closeButton) {
        a.closeButton.remove();
        a.closeButton = null;
      }
      // Blinking cursor trails the text as it deletes.
      a.textSpan.appendChild(a.cursor);
      const out = window.setInterval(() => {
        const current = a.content.textContent ?? "";
        if (current.length === 0) {
          window.clearInterval(out);
          hardRemove(a);
          return;
        }
        a.content.textContent = current.slice(0, -1);
      }, CHAR_OUT);
      a.typingTimer = out;
    }

    function open(ref: HTMLElement) {
      if (active && active.ref === ref && !active.closing) return;
      hardRemove(active);

      const text = ref.dataset.fnText ?? "";
      const stream = ` ${text}`; // leading space so it flows after the marker

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
        closeButton: null,
        typingTimer: null,
        closing: false,
      };
      active = a;

      let i = 0;
      a.typingTimer = window.setInterval(() => {
        if (active !== a || a.closing) return;
        if (i >= stream.length) {
          if (a.typingTimer !== null) window.clearInterval(a.typingTimer);
          a.typingTimer = null;
          a.cursor.remove();
          // Circular × close button, mirroring the footnote marker.
          const close = document.createElement("span");
          close.className = "footnote-close";
          close.textContent = "×";
          close.setAttribute("role", "button");
          close.setAttribute("tabindex", "0");
          close.setAttribute("aria-label", "Collapse footnote");
          textSpan.appendChild(close);
          a.closeButton = close;
        } else {
          content.textContent = stream.slice(0, i + 1);
          i += 1;
        }
      }, CHAR_IN);
    }

    // Click-only: no hover open/close.
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
