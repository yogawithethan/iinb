"use client";

import { useReaderSettings } from "./SettingsContext";
import { COMING_SOON } from "@/lib/comingSoon";
import {
  LockedRow,
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
    purchased,
    update,
  } = useReaderSettings();

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <section>
        <SectionLabel>Flow</SectionLabel>
        {COMING_SOON.pageTurn ? (
          <LockedRow
            label="Page-turn"
            description="Turn pages instead of scrolling — coming soon."
            badge="Soon"
            interactive={false}
          />
        ) : (
          <PillGroup
            value={scrollMode}
            onChange={(v) => update({ scrollMode: v })}
            options={[
              { value: "scroll", label: "Scroll" },
              { value: "page-turn", label: "Page-turn" },
            ]}
          />
        )}
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
        {purchased ? (
          <ToggleRow
            label="Rapid serial presentation"
            description="One word at a time, centered on screen."
            value={rsvpEnabled}
            onChange={(v) => update({ rsvpEnabled: v })}
          />
        ) : (
          <LockedRow
            label="Rapid serial presentation"
            description="One word at a time, centered on screen."
          />
        )}
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

