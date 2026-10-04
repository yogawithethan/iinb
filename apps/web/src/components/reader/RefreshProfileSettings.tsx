"use client";

import { ABOUT_MAX, useReaderSettings, type Decade } from "./SettingsContext";
import { SectionLabel } from "./SettingsPrimitives";

// The reader's "new examples" profile. Sent with every refresh so rewritten
// examples land in the reader's own era, humor and interests. Shared by the
// onboarding step and Settings → Reading so the options can't drift apart.
export const DECADES: Decade[] = ["70s", "80s", "90s", "00s", "10s"];
export const HUMOR_OPTIONS = ["Dry / deadpan", "Absurdist", "Pop-culture", "Keep it serious"];
export const CULTURE_OPTIONS = [
  "Gaming",
  "Sports",
  "Cooking",
  "Music",
  "Tech",
  "Fitness",
  "Film/TV",
  "Parenting",
];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function RefreshProfileSettings() {
  const { refreshProfile, update } = useReaderSettings();
  const set = (patch: Partial<typeof refreshProfile>) =>
    update({ refreshProfile: { ...refreshProfile, ...patch } });

  return (
    <section className="flex flex-col gap-3">
      <div>
        <SectionLabel>Your examples</SectionLabel>
        <p className="-mt-1 text-[12px] leading-snug" style={{ color: "var(--ink-tertiary)" }}>
          Tap ↻ beside a highlighted example in the book for a new one, written
          for you. The teaching stays the same; the example changes.
        </p>
      </div>

      <FieldLabel>Decade you grew up in</FieldLabel>
      <Chips
        options={DECADES}
        selected={refreshProfile.decade ? [refreshProfile.decade] : []}
        onToggle={(d) =>
          set({ decade: d === refreshProfile.decade ? null : (d as Decade) })
        }
      />

      <FieldLabel>Humor (pick any)</FieldLabel>
      <Chips
        options={HUMOR_OPTIONS}
        selected={refreshProfile.humor}
        onToggle={(h) => set({ humor: toggle(refreshProfile.humor, h) })}
      />

      <FieldLabel>Interests (pick any)</FieldLabel>
      <Chips
        options={CULTURE_OPTIONS}
        selected={refreshProfile.culture}
        onToggle={(c) => set({ culture: toggle(refreshProfile.culture, c) })}
      />

      <FieldLabel>About you (optional)</FieldLabel>
      <textarea
        value={refreshProfile.about}
        onChange={(e) => set({ about: e.target.value.slice(0, ABOUT_MAX) })}
        rows={3}
        maxLength={ABOUT_MAX}
        placeholder="e.g. Nurse in Chicago, two kids, obsessed with trail running and old Pixar movies."
        className="w-full resize-none rounded-[16px] bg-transparent px-3 py-2.5 text-[13px] leading-snug outline-none"
        style={{
          color: "var(--ink)",
          border: "1px solid var(--pill-border)",
          fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      />
      <p className="-mt-2 text-right text-[11px]" style={{ color: "var(--ink-tertiary)" }}>
        {refreshProfile.about.length}/{ABOUT_MAX}
      </p>
    </section>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <p className="-mb-1 text-[12px] font-medium" style={{ color: "var(--ink-secondary)" }}>
      {children}
    </p>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(opt)}
            className="rounded-full px-3 py-1.5 text-[13px] transition-all active:scale-[0.98]"
            style={{
              border: on ? "1.5px solid var(--accent)" : "1px solid var(--pill-border)",
              background: on ? "var(--accent-soft)" : "transparent",
              color: on ? "var(--accent-ink)" : "var(--ink-secondary)",
              fontWeight: on ? 600 : 500,
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
