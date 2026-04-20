"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two-phase open/close state for mounting+animating panels.
 *
 * Returns `mounted` (keep element in the tree) and `animate` (flip to the
 * "open" visual state). On close, `animate` flips to false first so the
 * exit transition runs; after `duration` ms, `mounted` flips to false.
 */
export function useOpenableState(
  open: boolean,
  duration = 200,
): { mounted: boolean; animate: boolean } {
  const [mounted, setMounted] = useState(open);
  const [animate, setAnimate] = useState(open);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) window.clearTimeout(timerRef.current);

    if (open) {
      setMounted(true);
      // Two rAFs: first ensures React has committed with animate=false,
      // second triggers the transition to animate=true.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setAnimate(true));
      });
    } else {
      setAnimate(false);
      timerRef.current = window.setTimeout(() => setMounted(false), duration);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [open, duration]);

  return { mounted, animate };
}
