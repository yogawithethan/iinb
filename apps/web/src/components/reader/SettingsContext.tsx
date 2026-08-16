"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clientPreviewState } from "@/lib/preview";

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

export type ReaderPosition = {
  chapterId?: string;
  scrollY?: number;
};

export type SyncedHighlight = {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
  anchor?: string;
  startOffset?: number;
  endOffset?: number;
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
  /** Canonical IINB entitlement resolved from the shared YWE member session. */
  purchased: boolean;
  /** True once the reader has completed the post-purchase onboarding. */
  onboarded: boolean;
  /** Verified email from the shared YWE member session. */
  userEmail: string | null;
  /** Personalization inputs for the refresh mechanic. */
  refreshProfile: RefreshProfile;
};

const ALL_THEMES: readonly Theme[] = ["light", "dark", "sepia", "oled"];

type Ctx = ReaderSettings & {
  update: (patch: Partial<ReaderSettings>) => void;
  authReady: boolean;
  loggedIn: boolean;
  refreshAccess: () => Promise<{ loggedIn: boolean; entitled: boolean; email?: string }>;
  readerPosition: ReaderPosition | null;
  syncedHighlights: SyncedHighlight[];
  readerSyncReady: boolean;
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
    // Ownership is never restored from browser storage. The shared YWE
    // session refresh below is the only source of truth.
    purchased: false,
    onboarded: Boolean(raw.onboarded ?? DEFAULTS.onboarded),
    userEmail: null,
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

function presentationSettings(settings: ReaderSettings): ReaderSettings {
  return { ...settings, purchased: false, userEmail: null };
}

export function ReaderSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [remoteSyncReady, setRemoteSyncReady] = useState(false);
  const [readerPosition, setReaderPosition] = useState<ReaderPosition | null>(null);
  const [syncedHighlights, setSyncedHighlights] = useState<SyncedHighlight[]>([]);
  const remoteLoadId = useRef(0);

  const refreshAccess = useCallback(async () => {
    const preview = clientPreviewState();
    if (preview) {
      // Dev preview: force the tier without hitting the auth backend.
      const loggedIn = preview !== "public";
      const entitled = preview === "purchased";
      setLoggedIn(loggedIn);
      setSettings((prev) => ({
        ...prev,
        purchased: entitled,
        userEmail: loggedIn ? "preview@iinb.local" : null,
      }));
      setReaderPosition(null);
      setSyncedHighlights([]);
      setRemoteSyncReady(false);
      setAuthReady(true);
      return { loggedIn, entitled };
    }
    const loadId = ++remoteLoadId.current;
    setRemoteSyncReady(false);
    try {
      const response = await fetch("/api/session", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "access_unavailable");
      const next = {
        loggedIn: Boolean(data.loggedIn),
        entitled: Boolean(data.entitled),
        email: typeof data.email === "string" ? data.email : undefined,
      };
      setLoggedIn(next.loggedIn);
      setSettings((prev) => ({
        ...prev,
        purchased: next.entitled,
        userEmail: next.email || null,
      }));
      let stateAvailable = false;
      if (next.entitled) {
        try {
          const stateResponse = await fetch("/api/reader-state", {
            credentials: "include",
            cache: "no-store",
          });
          const stateData = await stateResponse.json().catch(() => ({}));
          stateAvailable = stateResponse.ok;
          if (loadId === remoteLoadId.current && stateResponse.ok && stateData.state) {
            const remoteSettings = stateData.state.settings;
            if (remoteSettings && typeof remoteSettings === "object") {
              setSettings((prev) => ({
                ...sanitize({ ...prev, ...remoteSettings }),
                purchased: true,
                userEmail: next.email || null,
              }));
            }
            setReaderPosition(
              stateData.state.position && typeof stateData.state.position === "object"
                ? stateData.state.position
                : null,
            );
            setSyncedHighlights(Array.isArray(stateData.state.highlights) ? stateData.state.highlights : []);
          }
        } catch { /* access remains valid even when optional sync is unavailable */ }
      } else if (loadId === remoteLoadId.current) {
        setReaderPosition(null);
        setSyncedHighlights([]);
      }
      if (loadId === remoteLoadId.current) setRemoteSyncReady(next.entitled && stateAvailable);
      return next;
    } finally {
      setAuthReady(true);
    }
  }, []);

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
    void refreshAccess().catch(() => null);
  }, [hydrated, refreshAccess]);

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presentationSettings(settings)));
    } catch {
      // storage full / disabled
    }
  }, [settings, hydrated]);

  useEffect(() => {
    if (!hydrated || !settings.purchased || !remoteSyncReady) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/reader-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: presentationSettings(settings) }),
      }).catch(() => null);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [settings, hydrated, remoteSyncReady]);

  const update = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = sanitize({ ...prev, ...patch, purchased: false, userEmail: null });
      return { ...next, purchased: prev.purchased, userEmail: prev.userEmail };
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({ ...settings, update, authReady, loggedIn, refreshAccess, readerPosition, syncedHighlights, readerSyncReady: remoteSyncReady }),
    [settings, update, authReady, loggedIn, refreshAccess, readerPosition, syncedHighlights, remoteSyncReady],
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
