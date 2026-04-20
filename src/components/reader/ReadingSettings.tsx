"use client";

import { useReaderSettings } from "./SettingsContext";
import {
  PillGroup,
  SectionLabel,
  SliderRow,
  ToggleRow,
} from "./SettingsPrimitives";

export function ReadingSettings() {
  const {
    scrollMode,
    bionicReading,
    rsvpEnabled,
    rsvpWpm,
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
        <ToggleRow
          label="Rapid serial presentation"
          description="One word at a time, centered on screen."
          value={rsvpEnabled}
          onChange={(v) => update({ rsvpEnabled: v })}
        />
        <SliderRow
          label="Speed"
          min={200}
          max={800}
          step={25}
          value={rsvpWpm}
          unit="wpm"
          onChange={(v) => update({ rsvpWpm: v })}
          disabled={!rsvpEnabled}
        />
      </section>
    </div>
  );
}
