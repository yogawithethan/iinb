"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "sepia" | "oled";
export type ReadingFont = "serif" | "sans";
export type ReadingWidth = "narrow" | "medium" | "wide";
export type ScrollMode = "scroll" | "page-turn";
export type SleepTimer = 15 | 30 | 60 | "end" | null;
export type SkipInterval = 10 | 15 | 30 | 45;
export type Decade = "70s" | "80s" | "90s" | "00s" | "10s";

export type RefreshProfile = {
  decade: Decade | null;
  humor: string[];
  culture: string[];
};

export type ReaderSettings = {
  theme: Theme;
  fontFamily: ReadingFont;
  fontSize: number;
  readingWidth: ReadingWidth;
  /** Per-theme accent override. Null = use theme default. */
  accentByTheme: Record<Theme, string | null>;
  scrollMode: ScrollMode;
  bionicReading: boolean;
  rsvpEnabled: boolean;
  rsvpWpm: number;
  karaokeHighlight: boolean;
  autoScrollWithAudio: boolean;
  sleepTimer: SleepTimer;
  skipInterval: SkipInterval;
  /** Dev flag that simulates a logged-in, purchased reader. */
  purchased: boolean;
  /** True once the reader has completed the post-purchase onboarding. */
  onboarded: boolean;
  /** Email the reader signed up with (informational). */
  userEmail: string | null;
  /** Personalization inputs for the refresh mechanic. */
  refreshProfile: RefreshProfile;
};

const ALL_THEMES: readonly Theme[] = ["light", "dark", "sepia", "oled"];

type Ctx = ReaderSettings & {
  update: (patch: Partial<ReaderSettings>) => void;
};

const STORAGE_KEY = "iinb:reader-settings:v2";

const DEFAULTS: ReaderSettings = {
  theme: "light",
  fontFamily: "serif",
  fontSize: 18,
  readingWidth: "medium",
  accentByTheme: { light: null, dark: null, sepia: null, oled: null },
  purchased: false,
  onboarded: false,
  userEmail: null,
  refreshProfile: { decade: null, humor: [], culture: [] },
  scrollMode: "scroll",
  bionicReading: false,
  rsvpEnabled: false,
  rsvpWpm: 300,
  karaokeHighlight: true,
  autoScrollWithAudio: true,
  sleepTimer: null,
  skipInterval: 15,
};

const SettingsCtx = createContext<Ctx | null>(null);

function clampSize(n: number) {
  return Math.max(12, Math.min(28, Math.round(n)));
}
function clampWpm(n: number) {
  return Math.max(200, Math.min(800, Math.round(n)));
}

function sanitizeAccents(
  raw: unknown,
  legacyAccentColor: unknown,
  theme: Theme,
): Record<Theme, string | null> {
  const out: Record<Theme, string | null> = {
    light: null,
    dark: null,
    sepia: null,
    oled: null,
  };
  const hex = /^#[0-9a-f]{6}$/i;
  if (raw && typeof raw === "object") {
    for (const t of ALL_THEMES) {
      const v = (raw as Record<string, unknown>)[t];
      if (typeof v === "string" && hex.test(v)) out[t] = v;
    }
  }
  // Migrate legacy `accentColor` (single global) onto the active theme slot.
  if (
    typeof legacyAccentColor === "string" &&
    hex.test(legacyAccentColor) &&
    out[theme] === null
  ) {
    out[theme] = legacyAccentColor;
  }
  return out;
}

function sanitize(
  raw: Partial<ReaderSettings> & { accentColor?: unknown },
): ReaderSettings {
  const theme = (raw.theme as Theme) ?? DEFAULTS.theme;
  return {
    theme,
    fontFamily: (raw.fontFamily as ReadingFont) ?? DEFAULTS.fontFamily,
    fontSize: clampSize(raw.fontSize ?? DEFAULTS.fontSize),
    readingWidth:
      (raw.readingWidth as ReadingWidth) ?? DEFAULTS.readingWidth,
    accentByTheme: sanitizeAccents(raw.accentByTheme, raw.accentColor, theme),
    scrollMode: (raw.scrollMode as ScrollMode) ?? DEFAULTS.scrollMode,
    bionicReading: Boolean(raw.bionicReading ?? DEFAULTS.bionicReading),
    rsvpEnabled: Boolean(raw.rsvpEnabled ?? DEFAULTS.rsvpEnabled),
    rsvpWpm: clampWpm(raw.rsvpWpm ?? DEFAULTS.rsvpWpm),
    karaokeHighlight: Boolean(
      raw.karaokeHighlight ?? DEFAULTS.karaokeHighlight,
    ),
    autoScrollWithAudio: Boolean(
      raw.autoScrollWithAudio ?? DEFAULTS.autoScrollWithAudio,
    ),
    sleepTimer: (raw.sleepTimer as SleepTimer) ?? DEFAULTS.sleepTimer,
    skipInterval: (raw.skipInterval as SkipInterval) ?? DEFAULTS.skipInterval,
    purchased: Boolean(raw.purchased ?? DEFAULTS.purchased),
    onboarded: Boolean(raw.onboarded ?? DEFAULTS.onboarded),
    userEmail:
      typeof raw.userEmail === "string" && raw.userEmail.trim().length > 0
        ? raw.userEmail
        : null,
    refreshProfile: sanitizeRefreshProfile(raw.refreshProfile),
  };
}

function sanitizeRefreshProfile(raw: unknown): RefreshProfile {
  const decades: Decade[] = ["70s", "80s", "90s", "00s", "10s"];
  const out: RefreshProfile = { decade: null, humor: [], culture: [] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (typeof r.decade === "string" && decades.includes(r.decade as Decade)) {
    out.decade = r.decade as Decade;
  }
  if (Array.isArray(r.humor)) {
    out.humor = r.humor.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(r.culture)) {
    out.culture = r.culture.filter((x): x is string => typeof x === "string");
  }
  return out;
}

export function ReaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings(sanitize(JSON.parse(raw)));
    } catch {
      // ignore parse errors; defaults remain
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-reading-font", settings.fontFamily);
    root.setAttribute("data-reading-mode", settings.scrollMode);
    root.setAttribute(
      "data-bionic",
      settings.bionicReading ? "on" : "off",
    );
    // Apply per-theme accent override (or clear to fall back to theme default).
    // --accent-soft and --accent-ink are derived from --accent via color-mix
    // in globals.css, so we only need to set --accent here.
    const currentAccent = settings.accentByTheme[settings.theme];
    if (currentAccent) {
      root.style.setProperty("--accent", currentAccent);
    } else {
      root.style.removeProperty("--accent");
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage full / disabled
    }
  }, [settings, hydrated]);

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => sanitize({ ...prev, ...patch }));
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...settings, update }),
    [settings, update],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useReaderSettings(): Ctx {
  const ctx = useContext(SettingsCtx);
  if (!ctx)
    throw new Error(
      "useReaderSettings must be used inside <ReaderSettingsProvider>",
    );
  return ctx;
}
