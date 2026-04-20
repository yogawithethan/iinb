"use client";

import { useReaderSettings } from "./SettingsContext";
import {
  PillGroup,
  SectionLabel,
  SliderRow,
  ToggleRow,
} from "./SettingsPrimitives";
import { LockIcon } from "./icons";

export function ReadingSettings() {
  const {
    scrollMode,
    bionicReading,
    rsvpEnabled,
    rsvpWpm,
    purchased,
    update,
  } = useReaderSettings();

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <section>
        <SectionLabel>Flow</SectionLabel>
        <PillGroup
          value={scrollMode}
          onChange={(v) => update({ scrollMode: v })}
          options={[
            { value: "scroll", label: "Scroll" },
            { value: "page-turn", label: "Page-turn" },
          ]}
        />
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Accessibility</SectionLabel>
        <ToggleRow
          label="Bionic reading"
          description="Bold the first few letters of each word to create fixation points."
          value={bionicReading}
          onChange={(v) => update({ bionicReading: v })}
        />
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>RSVP</SectionLabel>
        <div className="relative">
          <ToggleRow
            label="Rapid serial presentation"
            description="One word at a time, centered on screen."
            value={rsvpEnabled && purchased}
            onChange={(v) => {
              if (!purchased) return;
              update({ rsvpEnabled: v });
            }}
          />
          {!purchased && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-[12px] pr-4"
              style={{
                background:
                  "color-mix(in srgb, var(--bg) 55%, transparent)",
              }}
            >
              <span
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em]"
                style={{
                  color: "var(--ink-tertiary)",
                  background:
                    "color-mix(in srgb, var(--ink-tertiary) 15%, transparent)",
                }}
              >
                <LockIcon size={12} />
                Premium
              </span>
            </div>
          )}
        </div>
        <SliderRow
          label="Speed"
          min={200}
          max={800}
          step={25}
          value={rsvpWpm}
          unit="wpm"
          onChange={(v) => update({ rsvpWpm: v })}
          disabled={!rsvpEnabled || !purchased}
        />
      </section>
    </div>
  );
}
