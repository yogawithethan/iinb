"use client";

import { useEffect, useRef } from "react";

// Page-turn reading mode. The reader is window-scrolled, so paging is just a
// smooth scroll by (almost) one viewport — which keeps scroll-spy, position
// save, and highlights all working. When active, wheel + swipe gestures turn
// pages instead of free-scrolling, plus arrow keys and the edge buttons.
export function PageTurn({ active }: { active: boolean }) {
  const cooldown = useRef(false);

  function pageStep() {
    // Leave a sliver of overlap so the last line carries into the next page.
    return Math.max(240, window.innerHeight - 96);
  }
  // Manual rAF scroll — `scrollBy({behavior:"smooth"})` is unreliable across
  // environments (silently no-ops in some), so animate position ourselves.
  function turn(dir: 1 | -1) {
    if (cooldown.current) return;
    const start = window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const target = Math.max(0, Math.min(maxY, start + dir * pageStep()));
    if (Math.abs(target - start) < 1) return;
    cooldown.current = true;
    const t0 = performance.now();
    const duration = 380;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    let rafFired = false;
    const step = (now: number) => {
      rafFired = true;
      const p = Math.min(1, (now - t0) / duration);
      window.scrollTo(0, start + (target - start) * ease(p));
      if (p < 1) {
        window.requestAnimationFrame(step);
      } else {
        cooldown.current = false;
      }
    };
    window.requestAnimationFrame(step);
    // Fallback: if rAF is throttled (hidden/background tab), jump instantly so
    // the page still turns rather than silently stalling.
    window.setTimeout(() => {
      if (!rafFired) {
        window.scrollTo(0, target);
        cooldown.current = false;
      }
    }, 140);
  }

  useEffect(() => {
    if (!active) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return;
      e.preventDefault();
      turn(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inField =
        t && typeof t.closest === "function"
          ? t.closest("input, textarea, select, [contenteditable='true']")
          : null;
      if (inField || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        turn(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        turn(-1);
      }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - (e.changedTouches[0]?.clientY ?? touchY);
      if (Math.abs(dy) > 44) turn(dy > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    document.documentElement.classList.add("reader-paged");
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      document.documentElement.classList.remove("reader-paged");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div aria-hidden={false}>
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => turn(-1)}
        className="page-turn-edge page-turn-edge--left"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next page"
        onClick={() => turn(1)}
        className="page-turn-edge page-turn-edge--right"
      >
        ›
      </button>
    </div>
  );
}
