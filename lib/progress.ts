import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'iinb:progress:v1';

export type Progress = {
  /** Current chapter id, derived from the topmost viewable item. */
  currentChapterId: string | null;
  /** Index of the topmost viewable item in the flat reader list — used to
   *  restore scroll position via FlashList's `initialScrollIndex`. */
  itemIndex: number;
  /** Per-chapter RSVP block index (resume RSVP at the right paragraph). */
  rsvpByChapter: Record<string, number>;
};

const DEFAULT: Progress = {
  currentChapterId: null,
  itemIndex: 0,
  rsvpByChapter: {},
};

export async function loadProgress(): Promise<Progress> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT, ...parsed };
  } catch {
    return DEFAULT;
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Progress | null = null;

export function saveProgress(p: Progress) {
  pending = p;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    if (pending) AsyncStorage.setItem(KEY, JSON.stringify(pending)).catch(() => {});
  }, 250);
}
