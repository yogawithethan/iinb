"use client";

// One tab switcher for every reader panel (Contents/Glossary, Display/Reading/
// Audio). Mirrors the site-wide sign-in sheet's Log in / Sign up pills in the
// shared <ywe-header>: a soft track, an ink "glider" that slides under the
// active label, and the label flipping to the page color.

import { LockIcon } from "./icons";

export type PillTab<T extends string> = { id: T; label: string; locked?: boolean };

export function PillTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: PillTab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  const width = 100 / tabs.length;

  return (
    <div
      role="tablist"
      aria-label={label}
      className="relative grid w-full rounded-full p-1"
      style={{
        gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        background: "color-mix(in srgb, var(--ink) 6%, transparent)",
      }}
    >
      <div
        aria-hidden="true"
        className="pill-tabs-glider absolute bottom-1 top-1 rounded-full"
        style={{
          left: 4,
          width: `calc(${width}% - ${8 / tabs.length}px)`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className="pill-tabs-label relative z-[1] rounded-full py-2.5 text-[14px] font-semibold"
            style={{
              color: isActive ? "var(--bg)" : "var(--ink-secondary)",
              fontFamily: "var(--font-poppins), ui-sans-serif, system-ui, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            <span className="inline-flex items-center justify-center gap-1">
              {tab.label}
              {tab.locked ? <LockIcon size={11} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
