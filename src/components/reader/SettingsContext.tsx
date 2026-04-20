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

export type ReaderSettings = {
  theme: Theme;
  fontFamily: ReadingFont;
  fontSize: number; // px, clamped 12–28
};

type Ctx = ReaderSettings & {
  setTheme: (t: Theme) => void;
  setFontFamily: (f: ReadingFont) => void;
  setFontSize: (n: number) => void;
};

const STORAGE_KEY = "iinb:reader-settings:v1";

const DEFAULTS: ReaderSettings = {
  theme: "light",
  fontFamily: "serif",
  fontSize: 18,
};

const SettingsCtx = createContext<Ctx | null>(null);

function clampSize(n: number) {
  return Math.max(12, Math.min(28, Math.round(n)));
}

export function ReaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted settings on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ReaderSettings>;
        setSettings({
          theme: (parsed.theme as Theme) ?? DEFAULTS.theme,
          fontFamily:
            (parsed.fontFamily as ReadingFont) ?? DEFAULTS.fontFamily,
          fontSize: clampSize(parsed.fontSize ?? DEFAULTS.fontSize),
        });
      }
    } catch {
      // ignore parse errors; fall back to defaults
    }
    setHydrated(true);
  }, []);

  // Sync theme + reading-font attributes to <html> for CSS variables to pick up.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-reading-font", settings.fontFamily);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage full / disabled — non-fatal
    }
  }, [settings, hydrated]);

  const setTheme = useCallback(
    (theme: Theme) => setSettings((s) => ({ ...s, theme })),
    [],
  );
  const setFontFamily = useCallback(
    (fontFamily: ReadingFont) =>
      setSettings((s) => ({ ...s, fontFamily })),
    [],
  );
  const setFontSize = useCallback(
    (fontSize: number) =>
      setSettings((s) => ({ ...s, fontSize: clampSize(fontSize) })),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({ ...settings, setTheme, setFontFamily, setFontSize }),
    [settings, setTheme, setFontFamily, setFontSize],
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
