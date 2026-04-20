"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------------- Color math ---------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  // h 0-360, s/v 0-1
  const c = v * s;
  const h1 = (h % 360) / 60;
  const x = c * (1 - Math.abs((h1 % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (h1 < 1) [r, g, b] = [c, x, 0];
  else if (h1 < 2) [r, g, b] = [x, c, 0];
  else if (h1 < 3) [r, g, b] = [0, c, x];
  else if (h1 < 4) [r, g, b] = [0, x, c];
  else if (h1 < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  h = (h * 60 + 360) % 360;
  const s = max === 0 ? 0 : delta / max;
  return [h, s, max];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) => clamp(n, 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ---------------- Component ---------------- */

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export function ColorPicker({ value, onChange }: Props) {
  const rgb = useMemo(() => hexToRgb(value) ?? [37, 99, 235], [value]);
  const [h, sSat, sVal] = useMemo(
    () => rgbToHsv(rgb[0], rgb[1], rgb[2]),
    [rgb],
  );
  // Keep local hue so saturation/value at h=0 doesn't snap (common picker UX)
  const [hue, setHue] = useState(h);
  useEffect(() => {
    // If incoming value has saturation > 0, sync the hue too; otherwise keep local
    if (sSat > 0.02) setHue(h);
  }, [h, sSat]);

  const svRef = useRef<HTMLDivElement | null>(null);
  const draggingSv = useRef(false);
  const draggingHue = useRef(false);

  const emit = useCallback(
    (newHue: number, s: number, v: number) => {
      const [r, g, b] = hsvToRgb(newHue, s, v);
      onChange(rgbToHex(r, g, b));
    },
    [onChange],
  );

  function handleSvDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    draggingSv.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleSvMove(e);
  }

  function handleSvMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingSv.current || !svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const s = x;
    const v = 1 - y;
    emit(hue, s, v);
  }

  function handleSvUp(e: React.PointerEvent<HTMLDivElement>) {
    draggingSv.current = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  function handleHueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newHue = Number(e.target.value);
    setHue(newHue);
    // Keep current S/V when hue changes
    const s = sSat > 0 ? sSat : 1;
    const v = sVal > 0 ? sVal : 1;
    emit(newHue, s, v);
  }

  function handleHexInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.trim();
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-f]{6}$/i.test(withHash)) onChange(withHash.toLowerCase());
  }

  const pointerX = `${sSat * 100}%`;
  const pointerY = `${(1 - sVal) * 100}%`;
  const hueColor = rgbToHex(...hsvToRgb(hue, 1, 1));

  return (
    <div className="flex flex-col gap-3">
      {/* Saturation × Value area */}
      <div
        ref={svRef}
        className="relative w-full cursor-crosshair touch-none overflow-hidden rounded-[12px]"
        style={{
          height: 140,
          background: `
            linear-gradient(to top, #000 0%, transparent 100%),
            linear-gradient(to right, #fff 0%, ${hueColor} 100%)
          `,
          border: "1px solid var(--pill-border)",
        }}
        onPointerDown={handleSvDown}
        onPointerMove={handleSvMove}
        onPointerUp={handleSvUp}
        onPointerCancel={handleSvUp}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute h-3 w-3 rounded-full"
          style={{
            left: pointerX,
            top: pointerY,
            transform: "translate(-50%, -50%)",
            background: value,
            border: "2px solid #fff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(hue)}
          onChange={handleHueChange}
          aria-label="Hue"
          className="iinb-hue-slider w-full"
        />
        <style jsx>{`
          .iinb-hue-slider {
            appearance: none;
            -webkit-appearance: none;
            height: 12px;
            border-radius: 999px;
            background: linear-gradient(
              to right,
              #ff0000 0%,
              #ffff00 17%,
              #00ff00 33%,
              #00ffff 50%,
              #0000ff 67%,
              #ff00ff 83%,
              #ff0000 100%
            );
            outline: none;
            border: 1px solid var(--pill-border);
          }
          .iinb-hue-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid ${value};
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
            cursor: pointer;
          }
          .iinb-hue-slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #fff;
            border: 2px solid ${value};
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2);
            cursor: pointer;
          }
        `}</style>
      </div>

      {/* Hex input + swatch */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-8 w-8 flex-shrink-0 rounded-full"
          style={{
            background: value,
            border: "1px solid var(--pill-border)",
          }}
        />
        <label className="relative flex-1">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            #
          </span>
          <input
            type="text"
            value={value.replace(/^#/, "")}
            onChange={handleHexInput}
            aria-label="Hex color"
            maxLength={6}
            className="w-full rounded-[10px] px-6 py-2 text-[13px] uppercase tracking-[0.04em] outline-none"
            style={{
              color: "var(--ink)",
              border: "1px solid var(--pill-border)",
              background: "transparent",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            }}
          />
        </label>
      </div>
    </div>
  );
}
