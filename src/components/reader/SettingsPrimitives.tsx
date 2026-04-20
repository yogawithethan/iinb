"use client";

import type { ReactNode } from "react";

/* ---------------- Section header ---------------- */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3
      className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em]"
      style={{ color: "var(--ink-tertiary)" }}
    >
      {children}
    </h3>
  );
}

/* ---------------- Toggle row ---------------- */
export function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between rounded-[12px] px-3 py-2.5 text-left transition-colors"
      style={{
        border: "1px solid var(--pill-border)",
        background: "transparent",
      }}
    >
      <span className="min-w-0 flex-1 pr-3">
        <span
          className="block text-[13px] font-medium"
          style={{ color: "var(--ink)" }}
        >
          {label}
        </span>
        {description ? (
          <span
            className="mt-0.5 block text-[11px] leading-snug"
            style={{ color: "var(--ink-tertiary)" }}
          >
            {description}
          </span>
        ) : null}
      </span>
      <Switch value={value} />
    </button>
  );
}

function Switch({ value }: { value: boolean }) {
  return (
    <span
      aria-hidden
      className="relative inline-flex h-[22px] w-[38px] flex-shrink-0 rounded-full transition-colors"
      style={{
        background: value
          ? "var(--accent)"
          : "color-mix(in srgb, var(--ink-tertiary) 35%, transparent)",
      }}
    >
      <span
        className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all"
        style={{
          left: value ? "18px" : "2px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </span>
  );
}

/* ---------------- Pill group ---------------- */
export function PillGroup<T extends string | number | null>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  columns?: 2 | 3 | 4;
}) {
  const colsClass =
    columns === 4
      ? "grid-cols-4"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2";
  return (
    <div className={`grid gap-2 ${colsClass}`}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className="rounded-[12px] px-3 py-2 text-[13px] transition-all active:scale-[0.98]"
            style={{
              border: selected
                ? "1.5px solid var(--accent)"
                : "1px solid var(--pill-border)",
              background: selected ? "var(--accent-soft)" : "transparent",
              color: selected ? "var(--accent-ink)" : "var(--ink-secondary)",
              fontWeight: selected ? 600 : 500,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Slider row ---------------- */
export function SliderRow({
  label,
  min,
  max,
  step = 1,
  value,
  unit = "",
  onChange,
  disabled,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.08em]"
          style={{ color: "var(--ink-tertiary)" }}
        >
          {label}
        </span>
        <span
          className="text-[11px] tabular-nums"
          style={{
            color: disabled ? "var(--ink-tertiary)" : "var(--ink-secondary)",
          }}
        >
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="iinb-slider w-full"
        style={{ opacity: disabled ? 0.4 : 1 }}
      />
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
