import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from './AuthContext';
import {
  PREMIUM_THEMES,
  THEME_TOKENS,
  type FontFamily,
  type ThemeId,
  type ThemeTokens,
} from './theme';

export type SleepTimer = null | 15 | 30 | 60 | 'end';
export type SkipInterval = 10 | 15 | 30 | 45;
export type ScrollMode = 'scroll' | 'page-turn';
export type Decade = '70s' | '80s' | '90s' | '00s' | '10s';

export type RefreshProfile = {
  decade: Decade | null;
  humor: string[];
  culture: string[];
};

export type Settings = {
  theme: ThemeId;
  fontFamily: FontFamily;
  fontSize: number;
  accentByTheme: Partial<Record<ThemeId, string | null>>;
  bionicReading: boolean;
  scrollMode: ScrollMode;
  rsvpWpm: number;
  karaokeHighlight: boolean;
  autoScrollWithAudio: boolean;
  sleepTimer: SleepTimer;
  skipInterval: SkipInterval;
  purchased: boolean;
  licenseEmail: string | null;
  /** Deprecated local access fields retained only for storage migration. */
  devSimulateSignedIn: boolean;
  /** True after the first-launch onboarding has been completed or skipped. */
  firstLaunched: boolean;
  onboarded: boolean;
  refreshProfile: RefreshProfile;
};

const DEFAULTS: Settings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 17,
  accentByTheme: {},
  bionicReading: false,
  scrollMode: 'scroll',
  rsvpWpm: 400,
  karaokeHighlight: true,
  autoScrollWithAudio: true,
  sleepTimer: null,
  skipInterval: 15,
  purchased: false,
  licenseEmail: null,
  devSimulateSignedIn: false,
  firstLaunched: false,
  onboarded: false,
  refreshProfile: { decade: null, humor: [], culture: [] },
};

const STORAGE_KEY = 'iinb:settings:v1';

type Ctx = Settings & {
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  tokens: ThemeTokens;
  accent: string;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setSettings({ ...DEFAULTS, ...parsed, purchased: false, licenseEmail: null, devSimulateSignedIn: false });
        } catch {}
      }
      setReady(true);
    });
  }, []);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch, purchased: false, licenseEmail: null, devSimulateSignedIn: false };
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      }, 150);
      return next;
    });
  };

  const tokens = THEME_TOKENS[settings.theme];
  const accentOverride = settings.accentByTheme[settings.theme];
  const accent = accentOverride ?? tokens.defaultAccent;

  // Ownership is always resolved by the canonical YWE entitlement service.
  const { entitled } = useAuth();

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      purchased: entitled,
      ready,
      update,
      tokens,
      accent,
    }),
    [settings, entitled, ready, tokens, accent]
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}

export function isThemePremium(id: ThemeId): boolean {
  return PREMIUM_THEMES.includes(id);
}
