"use client";

import { useReaderSettings, type SleepTimer, type SkipInterval } from "./SettingsContext";
import { PillGroup, SectionLabel, ToggleRow } from "./SettingsPrimitives";

const SLEEP_OPTIONS: { value: SleepTimer; label: string }[] = [
  { value: null, label: "Off" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: "end", label: "End of chapter" },
];

const SKIP_OPTIONS: { value: SkipInterval; label: string }[] = [
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 45, label: "45s" },
];

export function AudioSettings() {
  const {
    karaokeHighlight,
    autoScrollWithAudio,
    sleepTimer,
    skipInterval,
    update,
  } = useReaderSettings();

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <section className="flex flex-col gap-2">
        <SectionLabel>Narration</SectionLabel>
        <ToggleRow
          label="Karaoke highlighting"
          description="Highlight each word as it's narrated."
          value={karaokeHighlight}
          onChange={(v) => update({ karaokeHighlight: v })}
        />
        <ToggleRow
          label="Auto-scroll with audio"
          description="Keep the current word centered as narration plays."
          value={autoScrollWithAudio}
          onChange={(v) => update({ autoScrollWithAudio: v })}
        />
      </section>

      <section>
        <SectionLabel>Sleep timer</SectionLabel>
        <PillGroup
          value={sleepTimer}
          onChange={(v) => update({ sleepTimer: v })}
          options={SLEEP_OPTIONS}
          columns={3}
        />
      </section>

      <section>
        <SectionLabel>Skip interval</SectionLabel>
        <PillGroup
          value={skipInterval}
          onChange={(v) => update({ skipInterval: v })}
          options={SKIP_OPTIONS}
          columns={4}
        />
      </section>
    </div>
  );
}
