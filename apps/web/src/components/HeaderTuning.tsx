"use client";

import { useEffect } from "react";

// The global <ywe-header> renders a blank mobile bottom-nav bar in the
// immersive-detail preset. Hide just that bar (keeping the top menu/sidebar
// trigger for site navigation) by injecting a scoped style into this page's
// header shadow root — no effect on the header anywhere else.
export function HeaderTuning() {
  useEffect(() => {
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      const header = document.querySelector("ywe-header");
      const root = (header as unknown as { shadowRoot?: ShadowRoot | null })
        ?.shadowRoot;
      if (root) {
        if (!root.getElementById("iinb-header-tuning")) {
          const style = document.createElement("style");
          style.id = "iinb-header-tuning";
          style.textContent = ".mobile-bottom { display: none !important; }";
          root.appendChild(style);
        }
        window.clearInterval(id);
      } else if (tries > 60) {
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
