"use client";

import { useEffect } from "react";

const CHAR_INTERVAL = 18;
const COLLAPSE_DELAY = 400;

type Active = {
  ref: HTMLElement;
  textSpan: HTMLSpanElement;
  content: HTMLSpanElement;
  cursor: HTMLSpanElement;
  closeButton: HTMLElement | null;
  typingTimer: number | null;
};

function isFootnotePart(el: Element | null): HTMLElement | null {
  if (!el) return null;
  // Walk up — native contains() of element uses closest-like semantics.
  return (
    el.closest?.(".footnote-ref, .footnote-text") as HTMLElement | null
  );
}

export function FootnoteController() {
  useEffect(() => {
    let active: Active | null = null;
    let collapseTimer: number | null = null;
    let canHover = true;
    try {
      canHover = window.matchMedia("(hover: hover)").matches;
    } catch {
      canHover = true;
    }

    function clearCollapseTimer() {
      if (collapseTimer !== null) {
        window.clearTimeout(collapseTimer);
        collapseTimer = null;
      }
    }

    function scheduleCollapse() {
      clearCollapseTimer();
      collapseTimer = window.setTimeout(() => {
        collapseTimer = null;
        collapse();
      }, COLLAPSE_DELAY);
    }

    function collapse() {
      if (!active) return;
      if (active.typingTimer !== null) {
        window.clearInterval(active.typingTimer);
      }
      active.textSpan.remove();
      active = null;
    }

    function open(ref: HTMLElement) {
      if (active && active.ref === ref) return;
      collapse();
      clearCollapseTimer();

      const text = ref.dataset.fnText ?? "";
      // Prepend a space so the footnote flows naturally after the number.
      const stream = ` ${text}`;

      const textSpan = document.createElement("span");
      textSpan.className = "footnote-text";

      const cursor = document.createElement("span");
      cursor.className = "footnote-cursor";
      cursor.textContent = "|";
      textSpan.appendChild(cursor);

      const content = document.createElement("span");
      content.className = "footnote-content";
      textSpan.appendChild(content);

      ref.after(textSpan);

      let i = 0;
      const typingTimer = window.setInterval(() => {
        if (!active) return;
        if (i >= stream.length) {
          window.clearInterval(typingTimer);
          active.typingTimer = null;
          // Replace cursor with × close button.
          cursor.remove();
          const close = document.createElement("sup");
          close.className = "footnote-close";
          close.textContent = "×";
          close.setAttribute("role", "button");
          close.setAttribute("aria-label", "Collapse footnote");
          textSpan.appendChild(close);
          active.closeButton = close;
        } else {
          content.textContent = stream.slice(0, i + 1);
          i++;
        }
      }, CHAR_INTERVAL);

      active = {
        ref,
        textSpan,
        content,
        cursor,
        closeButton: null,
        typingTimer,
      };
    }

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      const closeBtn = target.closest?.(".footnote-close") as HTMLElement | null;
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation();
        collapse();
        return;
      }
      const ref = target.closest?.(".footnote-ref") as HTMLElement | null;
      if (ref) {
        e.preventDefault();
        e.stopPropagation();
        if (active && active.ref === ref) {
          collapse();
        } else {
          open(ref);
        }
      }
    }

    function onMouseOver(e: MouseEvent) {
      if (!canHover) return;
      const target = e.target as Element | null;
      const ref = target?.closest?.(".footnote-ref") as HTMLElement | null;
      const inFootnote = isFootnotePart(target);
      if (ref) {
        clearCollapseTimer();
        if (!active || active.ref !== ref) open(ref);
      } else if (inFootnote) {
        clearCollapseTimer();
      }
    }

    function onMouseOut(e: MouseEvent) {
      if (!canHover) return;
      const target = e.target as Element | null;
      const related = e.relatedTarget as Element | null;
      const leaving = isFootnotePart(target);
      if (!leaving) return;
      const entering = isFootnotePart(related);
      if (entering) return;
      scheduleCollapse();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") collapse();
    }

    document.addEventListener("click", onClick);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("keydown", onKey);
      collapse();
      clearCollapseTimer();
    };
  }, []);

  return null;
}
