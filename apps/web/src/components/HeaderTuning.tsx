"use client";

import { useEffect } from "react";

// The global <ywe-header> is built for normal pages, not the immersive reader.
// On mobile it (a) docks a floating bottom-nav pill, (b) lays a full-width top
// "frame" that swallows taps meant for the reader's own top-right controls, and
// (c) shows a hamburger where we want the sidebar glyph. We can't edit the
// shared component, so we inject one scoped stylesheet into THIS page's header
// shadow root — no effect on the header anywhere else.
const SIDEBAR_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='16' rx='2.5'/><path d='M9 4v16'/></svg>";

function tuningCss(): string {
  const mask = `url("data:image/svg+xml,${encodeURIComponent(SIDEBAR_SVG)}")`;
  return `
    /* (a) Never float the mobile bottom-nav pill in the reader. It still opens
       from the top sidebar trigger, so the menu stays reachable. */
    .mobile-bottom { display: none !important; }
    :host(:not(.open)) .mobile-shell { display: none !important; }

    /* (b) The top frame must not intercept taps — only its real controls do.
       Without this, the reader's Settings/Ask buttons underneath are dead. */
    .mt-frame { pointer-events: none !important; }
    .mt-frame button,
    .mt-frame a,
    .mt-frame [role="button"] { pointer-events: auto !important; }

    /* (c) Show the sidebar glyph (not a hamburger) on mobile, matching desktop. */
    .mt-frame .sidebar-trigger .ham-morph { display: none !important; }
    .mt-frame .sidebar-trigger::before {
      content: "";
      display: block;
      width: 18px;
      height: 18px;
      background: currentColor;
      -webkit-mask: ${mask} center / 18px 18px no-repeat;
      mask: ${mask} center / 18px 18px no-repeat;
    }

    /* (d) Dark-mode the mobile drawer. The shared header only applies its dark
       styles for [data-theme="dark"] — NOT "oled" — and even in dark it leaves
       the drawer surfaces on light opal backgrounds. So the reader's dark/oled
       theme looked half-applied (dark bg, dark text). We gate on an .iinb-dark
       class the reader sets on the host (see ensure()) and (1) give the header
       its full dark palette so text/icons/toggle flip, and (2) force the drawer
       surfaces dark directly (the base CSS sets those, not just via vars). */
    :host(.iinb-dark) {
      --bg: #16120d;
      --ink: #f3ede4;
      --ink2: #a59a8b;
      --border: rgba(255, 255, 255, 0.08);
      --card: rgba(255, 255, 255, 0.05);
      --row-active: rgba(255, 255, 255, 0.13);
      --hover: rgba(255, 255, 255, 0.06);
      --frost: rgba(40, 33, 24, 0.6);
      --pill-bg: rgba(255, 255, 255, 0.08);
      --scrim: rgba(0, 0, 0, 0.6);
      --mobile-surface: #1d1813;
      --mobile-bar-bg: #1d1813;
      --mobile-divider: rgba(255, 255, 255, 0.1);
      --control-inset: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 1px rgba(0, 0, 0, 0.22);
      --opal-parchment: linear-gradient(135deg, rgba(45, 38, 31, 0.94), rgba(24, 20, 16, 0.9));
      --opal-parchment-strong: linear-gradient(135deg, rgba(50, 42, 34, 0.97), rgba(25, 21, 17, 0.94));
      --opal-parchment-soft: linear-gradient(135deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.035));
      --opal-control: linear-gradient(135deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.065));
      --opal-control-quiet: linear-gradient(135deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025));
      --opal-edge: rgba(255, 255, 255, 0.15);
      --opal-edge-quiet: rgba(255, 255, 255, 0.09);
      --opal-inset: inset 0 1px 0 rgba(255, 255, 255, 0.13), inset 0 -1px 1px rgba(0, 0, 0, 0.25);
      --opal-shadow-frame: 0 24px 58px rgba(0, 0, 0, 0.34), 0 0 30px rgba(106, 87, 156, 0.08), var(--opal-inset);
      --opal-shadow-card: 0 12px 30px rgba(0, 0, 0, 0.22), var(--opal-inset);
    }
    :host(.iinb-dark) .theme-knob { transform: translateX(32px); }
    :host(.iinb-dark) .theme-knob .ti-sun { display: none; }
    :host(.iinb-dark) .theme-knob .ti-moon { display: inline-flex; }
    :host(.iinb-dark) .brand .logo img { filter: invert(1); }
    :host(.iinb-dark) .mobile-shell {
      background: linear-gradient(135deg, rgba(28, 24, 19, 0.99), rgba(16, 13, 10, 0.99)) !important;
    }
    :host(.iinb-dark) .drawer {
      background: linear-gradient(135deg, rgba(38, 32, 26, 0.99), rgba(22, 18, 14, 0.99)) !important;
    }
    :host(.iinb-dark) .card,
    :host(.iinb-dark) .card.primary,
    :host(.iinb-dark) .card.connect {
      background: rgba(255, 255, 255, 0.045) !important;
    }
    :host(.iinb-dark) .mb-item.tab.active,
    :host(.iinb-dark) .mb-ham,
    :host(.iinb-dark) .chev,
    :host(.iinb-dark) .sub-pill,
    :host(.iinb-dark) .row.active {
      background: rgba(255, 255, 255, 0.13) !important;
      color: #f3ede4 !important;
    }
  `;
}

export function HeaderTuning() {
  useEffect(() => {
    // The <ywe-header> web component rebuilds its shadow DOM on interaction
    // (theme toggle, menu open, auth state), which wipes a one-shot injection.
    // Keep a lightweight ensure-loop running so the tuning style is always
    // present — two cheap DOM lookups on a slow interval.
    const ensure = () => {
      const header = document.querySelector("ywe-header");
      if (!header) return;
      const root = (header as unknown as { shadowRoot?: ShadowRoot | null })
        .shadowRoot;
      if (!root) return;
      if (!root.getElementById("iinb-header-tuning")) {
        const style = document.createElement("style");
        style.id = "iinb-header-tuning";
        style.textContent = tuningCss();
        root.appendChild(style);
      }
      // Mirror the reader's dark/oled theme onto the header host so the
      // drawer-dark rules above apply (the header's own dark theming misses
      // the drawer surfaces).
      const theme = document.documentElement.getAttribute("data-theme") || "";
      header.classList.toggle(
        "iinb-dark",
        theme === "dark" || theme === "oled",
      );
    };
    ensure();
    const id = window.setInterval(ensure, 400);
    return () => window.clearInterval(id);
  }, []);
  return null;
}
