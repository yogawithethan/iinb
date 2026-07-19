export type ThemeId = 'light' | 'dark' | 'sepia' | 'oled';
export type FontFamily = 'serif' | 'sans';

export const PREMIUM_THEMES: ThemeId[] = ['sepia', 'oled'];

export type ThemeTokens = {
  bg: string;
  bgSoft: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  pillBorder: string;
  defaultAccent: string;
};

export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  light: {
    bg: '#fdf9f4',
    bgSoft: 'rgba(0,0,0,0.04)',
    ink: '#1a1712',
    inkSecondary: '#5b544a',
    inkTertiary: '#8a8278',
    pillBorder: 'rgba(0,0,0,0.08)',
    defaultAccent: '#2563eb',
  },
  dark: {
    bg: '#18181b',
    bgSoft: 'rgba(255,255,255,0.06)',
    ink: '#ededed',
    inkSecondary: '#b8b3aa',
    inkTertiary: '#7a766f',
    pillBorder: 'rgba(255,255,255,0.10)',
    defaultAccent: '#60a5fa',
  },
  sepia: {
    bg: '#f5ecd7',
    bgSoft: 'rgba(60,30,10,0.06)',
    ink: '#3a2a17',
    inkSecondary: '#6b5839',
    inkTertiary: '#9a8868',
    pillBorder: 'rgba(60,30,10,0.12)',
    defaultAccent: '#b4653a',
  },
  oled: {
    bg: '#000000',
    bgSoft: 'rgba(255,255,255,0.05)',
    ink: '#f2f2f2',
    inkSecondary: '#bdbdbd',
    inkTertiary: '#7a7a7a',
    pillBorder: 'rgba(255,255,255,0.10)',
    defaultAccent: '#6ba6ff',
  },
};

export const THEME_CARDS: { id: ThemeId; label: string; bg: string; ink: string }[] = [
  { id: 'light', label: 'Light', bg: '#ffffff', ink: '#1a1a1a' },
  { id: 'dark', label: 'Dark', bg: '#18181b', ink: '#ededed' },
  { id: 'sepia', label: 'Sepia', bg: '#f5ecd7', ink: '#3a2a17' },
  { id: 'oled', label: 'OLED', bg: '#000000', ink: '#f2f2f2' },
];

export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
