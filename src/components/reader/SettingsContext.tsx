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

export type ReaderSettings = {
  theme: Theme;
  fontFamily: ReadingFont;
  fontSize: number;
  readingWidth: ReadingWidth;
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
};

type Ctx = ReaderSettings & {
  update: (patch: Partial<ReaderSettings>) => void;
};

const STORAGE_KEY = "iinb:reader-settings:v2";

const DEFAULTS: ReaderSettings = {
  theme: "light",
  fontFamily: "serif",
  fontSize: 18,
  readingWidth: "medium",
  purchased: false,
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

function sanitize(raw: Partial<ReaderSettings>): ReaderSettings {
  return {
    theme: (raw.theme as Theme) ?? DEFAULTS.theme,
    fontFamily: (raw.fontFamily as ReadingFont) ?? DEFAULTS.fontFamily,
    fontSize: clampSize(raw.fontSize ?? DEFAULTS.fontSize),
    readingWidth:
      (raw.readingWidth as ReadingWidth) ?? DEFAULTS.readingWidth,
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
  };
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
