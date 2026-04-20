"use client";

import {
  useReaderSettings,
  type ReadingWidth,
  type Theme,
} from "./SettingsContext";
import { LockedRow, SectionLabel, ToggleRow } from "./SettingsPrimitives";
import { ColorPicker } from "./ColorPicker";
import { LockIcon } from "./icons";
import { usePaywall } from "./PaywallContext";
import clsx from "clsx";

const PREMIUM_THEMES = new Set<Theme>(["sepia", "oled"]);

const DEFAULT_ACCENTS_BY_THEME: Record<Theme, string> = {
  light: "#2563eb",
  dark: "#60a5fa",
  sepia: "#b4653a",
  oled: "#6ba6ff",
};

const THEME_CARDS: { id: Theme; label: string; bg: string; ink: string }[] = [
  { id: "light", label: "Light", bg: "#ffffff", ink: "#1a1a1a" },
  { id: "dark", label: "Dark", bg: "#18181b", ink: "#ededed" },
  { id: "sepia", label: "Sepia", bg: "#f5ecd7", ink: "#3a2a17" },
  { id: "oled", label: "OLED", bg: "#000000", ink: "#f2f2f2" },
];

const WIDTH_OPTIONS: { id: ReadingWidth; label: string }[] = [
  { id: "narrow", label: "Narrow" },
  { id: "medium", label: "Medium" },
  { id: "wide", label: "Wide" },
];

export function DisplaySettings() {
  const {
    theme,
    fontFamily,
    fontSize,
    readingWidth,
    accentColor,
    purchased,
    update,
  } = useReaderSettings();
  const paywall = usePaywall();
  const currentAccent =
    accentColor ?? DEFAULT_ACCENTS_BY_THEME[theme] ?? "#2563eb";

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <section>
        <h3
          className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Theme
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {THEME_CARDS.map((t) => {
            const selected = theme === t.id;
            const isLocked = !purchased && PREMIUM_THEMES.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  isLocked
                    ? paywall?.openPaywall()
                    : update({ theme: t.id })
                }
                aria-pressed={selected}
                aria-label={isLocked ? `${t.label} (premium)` : t.label}
                className={clsx(
                  "relative flex flex-col items-center gap-1.5 rounded-[14px] p-2 transition-all active:scale-95",
                )}
                style={{
                  border: selected
                    ? "1.5px solid var(--accent)"
                    : "1px solid var(--pill-border)",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  aria-hidden
                  className="flex h-10 w-full items-center justify-center rounded-[9px] font-serif text-[15px]"
                  style={{
                    background: t.bg,
                    color: t.ink,
                    border: "1px solid rgba(0,0,0,0.06)",
                    opacity: isLocked ? 0.55 : 1,
                  }}
                >
                  Aa
                </span>
                <span
                  className="text-[11px]"
                  style={{
                    color: selected
                      ? "var(--accent-ink)"
                      : "var(--ink-secondary)",
                    fontWeight: selected ? 600 : 500,
                    opacity: isLocked ? 0.65 : 1,
                  }}
                >
                  {t.label}
                </span>
                {isLocked && (
                  <span
                    aria-hidden
                    className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }}
                  >
                    <LockIcon size={10} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3
            className="text-[11px] font-medium uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Text size
          </h3>
          <span
            className="text-[11px] tabular-nums"
            style={{ color: "var(--ink-secondary)" }}
          >
            {fontSize}px
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="font-serif leading-none"
            style={{ color: "var(--ink-secondary)", fontSize: "13px" }}
          >
            A
          </span>
          <input
            type="range"
            min={12}
            max={28}
            step={1}
            value={fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            aria-label="Text size"
            className="iinb-slider flex-1"
          />
          <span
            aria-hidden
            className="font-serif leading-none"
            style={{ color: "var(--ink-secondary)", fontSize: "22px" }}
          >
            A
          </span>
        </div>
      </section>

      <section>
        <h3
          className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Reading width
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {WIDTH_OPTIONS.map((w) => {
            const selected = readingWidth === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => update({ readingWidth: w.id })}
                aria-pressed={selected}
                className="rounded-[12px] px-3 py-2 text-[13px] transition-all active:scale-[0.98]"
                style={{
                  border: selected
                    ? "1.5px solid var(--accent)"
                    : "1px solid var(--pill-border)",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  color: selected
                    ? "var(--accent-ink)"
                    : "var(--ink-secondary)",
                  fontWeight: selected ? 600 : 500,
                }}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3
          className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          Font
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(["serif", "sans"] as const).map((f) => {
            const selected = fontFamily === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => update({ fontFamily: f })}
                aria-pressed={selected}
                className="rounded-[12px] px-3 py-2.5 text-[14px] transition-all active:scale-[0.98]"
                style={{
                  border: selected
                    ? "1.5px solid var(--accent)"
                    : "1px solid var(--pill-border)",
                  background: selected ? "var(--accent-soft)" : "transparent",
                  color: selected
                    ? "var(--accent-ink)"
                    : "var(--ink-secondary)",
                  fontFamily:
                    f === "serif"
                      ? "var(--font-lora), ui-serif, Georgia, serif"
                      : "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
                  fontWeight: selected ? 600 : 500,
                }}
              >
                {f === "serif" ? "Serif" : "Sans-serif"}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3
            className="text-[11px] font-medium uppercase tracking-[0.08em]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Accent color
          </h3>
          {purchased && accentColor ? (
            <button
              type="button"
              onClick={() => update({ accentColor: null })}
              className="text-[11px] underline underline-offset-4 transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-tertiary)" }}
            >
              Reset
            </button>
          ) : null}
        </div>
        {purchased ? (
          <ColorPicker
            value={currentAccent}
            onChange={(hex) => update({ accentColor: hex })}
          />
        ) : (
          <LockedRow
            label="Custom accent color"
            description="Tint the app with any color you like."
          />
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Access (preview)</SectionLabel>
        <ToggleRow
          label="Premium unlocked"
          description="Simulates a paid account. Unlocks paid chapters, hides lock icons."
          value={purchased}
          onChange={(v) => update({ purchased: v })}
        />
      </section>

      <style jsx>{`
        .iinb-slider {
          appearance: none;
          -webkit-appearance: none;
          height: 4px;
          border-radius: 999px;
          background: color-mix(
            in srgb,
            var(--ink-tertiary) 35%,
            transparent
          );
          outline: none;
        }
        .iinb-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
        .iinb-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
