import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  Share,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlashList, type FlashListRef, type ViewToken } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import chapters from '@/content/chapters.json';
import partsJson from '@/content/parts.json';
import dedicationJson from '@/content/dedication.json';
import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { useAuth } from '@/lib/AuthContext';
import { parseBlocks, type Block } from '@/lib/blocks';
import { loadProgress, saveProgress, type Progress } from '@/lib/progress';
import { refreshParagraph, refreshSpan } from '@/lib/refresh-paragraph';
import { withAlpha } from '@/lib/theme';
import { TocPanel } from '@/components/reader/TocPanel';
import { SettingsPanel } from '@/components/reader/SettingsPanel';
import { RsvpOverlay } from '@/components/reader/RsvpOverlay';
import { BlockRenderer } from '@/components/reader/BlockRenderer';
import { GlossaryCard } from '@/components/reader/GlossaryCard';
import { findGlossaryEntry } from '@/lib/inline';
import { Onboarding } from '@/components/reader/Onboarding';
import { FirstLaunchOnboarding } from '@/components/reader/FirstLaunchOnboarding';
import { FEATURES, openCheckout } from '@/components/reader/PaywallCard';
import {
  PRODUCT_FULL_BOOK,
  isIapAvailable,
  purchaseProduct,
} from '@/lib/iap';
import { AskPanel } from '@/components/reader/AskPanel';
import { SearchPanel } from '@/components/reader/SearchPanel';

type Chapter = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  part: string;
  isFree: boolean;
  body: string;
};

type Part = {
  id: string;
  order: number;
  numeral: string;
  title: string;
  matchesChapterPart: string;
  body: string;
};

const CHAPTERS = chapters as Chapter[];
const PARTS = partsJson as Part[];
const PART_BY_LABEL = new Map(PARTS.map((p) => [p.matchesChapterPart, p]));

// Part divider icons: Part I caterpillar → Part II cocoon → Part III butterfly.
// Keyed by part `id` from parts.json.
const PART_ICONS: Record<string, ReturnType<typeof require>> = {
  'part-1': require('@/assets/images/caterpillar.png'),
  'part-2': require('@/assets/images/cocoon.png'),
  'part-3': require('@/assets/images/butterfly.png'),
};

type Epigraph = { quote: string; attribution: string };

function parseEpigraphs(body: string): Epigraph[] {
  // Each blank-line-separated chunk is a single epigraph. Lines start with
  // "> "; the trailing line that begins with an em-dash is the attribution.
  const out: Epigraph[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('<!--'))
      .map((l) => (l.startsWith('> ') ? l.slice(2) : l));
    if (lines.length === 0) continue;
    let attribution = '';
    const quoteLines: string[] = [];
    for (const line of lines) {
      if (/^[—–-]\s/.test(line)) attribution = line.replace(/^[—–-]\s*/, '');
      else quoteLines.push(line);
    }
    const quote = quoteLines.join(' ').replace(/^[“"]+|[”"]+$/g, '').trim();
    if (quote) out.push({ quote, attribution });
  }
  return out;
}
// Floating panels begin this far below the screen top (matches the visual top
// of the row of header buttons + a touch of breathing room).
const PANEL_TOP = 100;

type HeaderButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  /** True when *some* sheet is open and this button is not the active one —
   *  renders hollow with white border + icon so it reads on the dim backdrop. */
  dimmed?: boolean;
  onPress: () => void;
};

function HeaderButton({ icon, label, active, dimmed, onPress }: HeaderButtonProps) {
  const { tokens, accent } = useSettings();

  let backgroundColor: string;
  let borderColor: string;
  let iconColor: string;
  if (active) {
    backgroundColor = accent;
    borderColor = tokens.bg;
    iconColor = tokens.bg;
  } else if (dimmed) {
    backgroundColor = 'transparent';
    borderColor = '#ffffff';
    iconColor = '#ffffff';
  } else {
    backgroundColor = tokens.bg;
    borderColor = tokens.pillBorder;
    iconColor = tokens.ink;
  }

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
      style={{ backgroundColor, borderWidth: 1, borderColor }}
    >
      <Ionicons name={icon} size={18} color={iconColor} />
    </Pressable>
  );
}

type Sheet = 'toc' | 'settings' | 'ask' | 'search' | null;

/** One row in the flat virtualized reader list. */
type ReaderItem =
  | { kind: 'dedication' }
  | { kind: 'part'; part: Part }
  | { kind: 'chapter-header'; chapter: Chapter; afterPart: boolean; isFirst: boolean }
  | {
      kind: 'block';
      chapter: Chapter;
      blockIdx: number;
      block: Block;
      isLast: boolean;
    };

/** Stable keys per row — required for virtualized list reconciliation. */
function readerKeyExtractor(item: ReaderItem, index: number): string {
  switch (item.kind) {
    case 'dedication':
      return 'dedication';
    case 'part':
      return `part:${item.part.id}`;
    case 'chapter-header':
      return `head:${item.chapter.id}`;
    case 'block':
      return `blk:${item.chapter.id}:${item.blockIdx}`;
    default:
      return `row:${index}`;
  }
}

/** Letting FlashList know an item's type lets it pool views for recycling. */
function readerItemType(item: ReaderItem): string {
  return item.kind;
}

function PartDivider({
  part,
  bodyFont,
  italicFamily,
  fontSize,
  ink,
  inkSecondary,
  inkTertiary,
  accent,
  minHeight,
}: {
  part: Part;
  bodyFont: string;
  italicFamily: string;
  fontSize: number;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  accent: string;
  minHeight: number;
}) {
  const epigraphs = useMemo(() => parseEpigraphs(part.body), [part.body]);
  const icon = PART_ICONS[part.id];
  return (
    <View
      style={{
        minHeight,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        gap: 18,
      }}
    >
      {icon ? (
        <Image
          source={icon}
          // tintColor recolors a single-tone PNG, so the icon flips automatically
          // between light and dark themes — `ink` already swaps with the theme.
          style={{ width: 60, height: 60, tintColor: ink, marginBottom: 4 }}
          resizeMode="contain"
        />
      ) : null}
      <Text
        style={{
          fontFamily: bodyFont,
          fontSize: 12,
          letterSpacing: 3,
          color: accent,
          textTransform: 'uppercase',
        }}
      >
        {part.numeral}
      </Text>
      <Text
        style={{
          fontFamily: bodyFont,
          fontSize: fontSize + 18,
          lineHeight: (fontSize + 18) * 1.15,
          color: ink,
          textAlign: 'center',
        }}
      >
        {part.title}
      </Text>
      {epigraphs.length > 0 ? (
        <View
          style={{
            marginTop: 18,
            gap: 22,
            width: '100%',
            paddingHorizontal: 8,
          }}
        >
          {epigraphs.map((e, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 6 }}>
              <Text
                style={{
                  fontFamily: italicFamily,
                  fontStyle: 'italic',
                  fontSize: fontSize + 1,
                  lineHeight: (fontSize + 1) * 1.55,
                  color: inkSecondary,
                  textAlign: 'center',
                }}
              >
                “{e.quote}”
              </Text>
              {e.attribution ? (
                <Text
                  style={{
                    fontFamily: bodyFont,
                    fontSize: fontSize - 3,
                    color: inkTertiary,
                    textAlign: 'center',
                    letterSpacing: 0.5,
                  }}
                >
                  — {e.attribution}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function ReaderScreen() {
  const { ready, fontFamily, fontSize, bionicReading, purchased, onboarded, firstLaunched, accent, tokens, refreshProfile } = useSettings();
  const { user, refreshEntitlements } = useAuth();
  const [purchasingFullBook, setPurchasingFullBook] = useState(false);
  const handleBuyFullBook = async () => {
    if (!isIapAvailable()) {
      if (!user) {
        open('settings', 'profile', { authOpen: true });
        return;
      }
      const result = await openCheckout();
      if (result.kind === 'sign_in_required') {
        open('settings', 'profile', { authOpen: true });
      } else if (result.kind === 'error') {
        Alert.alert('Checkout unavailable', result.message);
      }
      return;
    }
    if (purchasingFullBook) return;
    setPurchasingFullBook(true);
    const result = await purchaseProduct(PRODUCT_FULL_BOOK);
    setPurchasingFullBook(false);
    if (result.kind === 'ok' && result.entitled) {
      await refreshEntitlements();
      setPaywallOpen(false);
    } else if (result.kind === 'sign_in_required') {
      open('settings', 'profile', { authOpen: true });
    } else if (result.kind === 'error' && result.message !== 'cancelled') {
      Alert.alert('Purchase failed', result.message);
    }
  };
  const isAuthed = Boolean(user);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // The reader sits inside a Tabs navigator — the bottom tab bar already
  // includes the safe-area bottom inset, so don't double-subtract it.
  const tabBarHeight = useBottomTabBarHeight();
  // Panel may extend from PANEL_TOP down to (screen height − tab bar − a small gutter).
  const panelMaxHeight = windowHeight - PANEL_TOP - tabBarHeight - 16;
  const [currentId, setCurrentId] = useState(CHAPTERS[0].id);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [mounted, setMounted] = useState<Sheet>(null);
  const [rsvpActive, setRsvpActive] = useState(false);
  /** True when the user tapped Begin RSVP and is now picking a starting paragraph. */
  const [pickingRsvpStart, setPickingRsvpStart] = useState(false);
  const [pendingRsvpStartIdx, setPendingRsvpStartIdx] = useState<number | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const chromeVisible = useSharedValue(1);

  // Track touch start so we can distinguish a tap from a scroll.
  const touchStart = useRef<{ x: number; y: number; t: number; scrolled: boolean } | null>(null);

  const toggleChrome = () => {
    if (sheet) return; // ignore taps while a sheet is open
    chromeVisible.value = withTiming(chromeVisible.value > 0.5 ? 0 : 1, { duration: 220 });
  };

  // While picking an RSVP starting paragraph, fade the floating chrome out so
  // the reading area takes over the screen. Restore on cancel/exit.
  useEffect(() => {
    chromeVisible.value = withTiming(pickingRsvpStart ? 0 : 1, { duration: 220 });
  }, [pickingRsvpStart, chromeVisible]);

  /** Per-block AI rewrites, keyed by `${chapterId}-${blockIdx}`. */
  const [rewrites, setRewrites] = useState<Record<string, string>>({});
  const [refreshLoadingKey, setRefreshLoadingKey] = useState<string | null>(null);
  /** Per-span AI rewrites for `{{...}}` markers, keyed by
   *  `${chapterId}-${blockIdx}-${spanIdx}`. */
  const [spanRewrites, setSpanRewrites] = useState<Record<string, string>>({});
  const [spanLoadingKey, setSpanLoadingKey] = useState<string | null>(null);
  /** Glossary term currently being shown in the centered popup. Null = closed. */
  const [glossaryTerm, setGlossaryTerm] = useState<string | null>(null);

  const refreshParagraphAt = async (
    chapterId: string,
    blockIdx: number,
    originalText: string,
  ) => {
    if (!purchased) {
      setPaywallOpen(true);
      return;
    }
    const key = `${chapterId}-${blockIdx}`;
    setRefreshLoadingKey(key);
    const result = await refreshParagraph(originalText, refreshProfile);
    setRefreshLoadingKey((prev) => (prev === key ? null : prev));
    if (result.kind === 'ok') {
      setRewrites((prev) => ({ ...prev, [key]: result.rewrite }));
      return;
    }
    if (result.kind === 'sign_in_required') {
      open('settings', 'profile', { authOpen: true });
      return;
    }
    if (result.kind === 'purchase_required') {
      setPaywallOpen(true);
      return;
    }
    Alert.alert('Refresh failed', result.message ?? 'Try again in a moment.');
  };

  const refreshSpanAt = async (
    chapterId: string,
    blockIdx: number,
    spanIdx: number,
    original: string,
    paragraph: string,
  ) => {
    if (!purchased) {
      setPaywallOpen(true);
      return;
    }
    const key = `${chapterId}-${blockIdx}-${spanIdx}`;
    setSpanLoadingKey(key);
    const result = await refreshSpan(paragraph, original, refreshProfile);
    setSpanLoadingKey((prev) => (prev === key ? null : prev));
    if (result.kind === 'ok') {
      setSpanRewrites((prev) => ({ ...prev, [key]: result.rewrite }));
      return;
    }
    if (result.kind === 'sign_in_required') {
      open('settings', 'profile', { authOpen: true });
      return;
    }
    if (result.kind === 'purchase_required') {
      setPaywallOpen(true);
      return;
    }
    Alert.alert('Refresh failed', result.message ?? 'Try again in a moment.');
  };

  const revertSpanAt = (chapterId: string, blockIdx: number, spanIdx: number) => {
    const key = `${chapterId}-${blockIdx}-${spanIdx}`;
    setSpanRewrites((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const revertParagraphAt = (chapterId: string, blockIdx: number) => {
    const key = `${chapterId}-${blockIdx}`;
    setRewrites((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const dismissPaywallAndOpenAuth = () => {
    setPaywallOpen(false);
    setTimeout(() => open('settings', 'profile', { authOpen: true }), 200);
  };
  const [progressLoaded, setProgressLoaded] = useState(false);
  const progressRef = useRef<Progress>({
    currentChapterId: null,
    itemIndex: 0,
    rsvpByChapter: {},
  });
  const listRef = useRef<FlashListRef<ReaderItem>>(null);
  /** The most recently observed topmost-viewable item index — used as the
   *  source of truth for "where the reader is" for both the snapback pill
   *  and the persistence layer. */
  const topVisibleIndex = useRef(0);
  const [snapshot, setSnapshot] = useState<{ index: number; label: string } | null>(null);
  /** Set once on mount; FlashList reads it as `initialScrollIndex`. */
  const initialScrollIndex = useRef(0);

  /** All chapters, parsed once. */
  const allChapters = useMemo(
    () => CHAPTERS.map((c) => ({ chapter: c, blocks: parseBlocks(c.body) })),
    [],
  );

  /** Flat item list for FlashList — dedication, then for each chapter a
   *  (optional) part-divider, chapter-header, and one item per block. */
  const items = useMemo<ReaderItem[]>(() => {
    const out: ReaderItem[] = [{ kind: 'dedication' }];
    let prevPart: string | null = null;
    allChapters.forEach(({ chapter: c, blocks: bs }, ci) => {
      const partChanged = !!c.part && c.part !== prevPart;
      const part = partChanged ? PART_BY_LABEL.get(c.part) ?? null : null;
      if (part) out.push({ kind: 'part', part });
      out.push({
        kind: 'chapter-header',
        chapter: c,
        afterPart: !!part,
        isFirst: ci === 0,
      });
      for (let i = 0; i < bs.length; i++) {
        out.push({
          kind: 'block',
          chapter: c,
          blockIdx: i,
          block: bs[i],
          isLast: i === bs.length - 1,
        });
      }
      prevPart = c.part || prevPart;
    });
    return out;
  }, [allChapters]);

  /** Lookups: chapter id → header item index; "chapterId-blockIdx" → block item index. */
  const { chapterIndex, blockIndex } = useMemo(() => {
    const ci: Record<string, number> = {};
    const bi: Record<string, number> = {};
    items.forEach((it, idx) => {
      if (it.kind === 'chapter-header') ci[it.chapter.id] = idx;
      else if (it.kind === 'block') bi[`${it.chapter.id}-${it.blockIdx}`] = idx;
    });
    return { chapterIndex: ci, blockIndex: bi };
  }, [items]);

  // Load saved progress once. Set the initialScrollIndex synchronously so
  // FlashList opens at the right spot on first render.
  useEffect(() => {
    loadProgress().then((p) => {
      progressRef.current = p;
      if (p.currentChapterId && CHAPTERS.some((c) => c.id === p.currentChapterId)) {
        setCurrentId(p.currentChapterId);
      }
      initialScrollIndex.current = Math.min(p.itemIndex ?? 0, items.length - 1);
      topVisibleIndex.current = initialScrollIndex.current;
      setProgressLoaded(true);
    });
  }, [items.length]);

  // Persist chapter id whenever the derived current chapter changes.
  useEffect(() => {
    if (!progressLoaded) return;
    progressRef.current = { ...progressRef.current, currentChapterId: currentId };
    saveProgress(progressRef.current);
  }, [currentId, progressLoaded]);

  /** Called by FlashList whenever the set of viewable items changes. We pick
   *  the smallest index from the visible window (i.e. the topmost item) to
   *  drive both `currentId` (which chapter we're in) and persistence. */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ReaderItem>[] }) => {
      if (viewableItems.length === 0) return;
      let topIdx = Infinity;
      let topItem: ReaderItem | null = null;
      for (const v of viewableItems) {
        if (typeof v.index === 'number' && v.index < topIdx) {
          topIdx = v.index;
          topItem = (v.item as ReaderItem) ?? null;
        }
      }
      if (!Number.isFinite(topIdx) || !topItem) return;
      topVisibleIndex.current = topIdx;
      progressRef.current = { ...progressRef.current, itemIndex: topIdx };
      saveProgress(progressRef.current);

      // Map the topmost visible item back to a chapter id for the TOC indicator.
      const chId =
        topItem.kind === 'chapter-header'
          ? topItem.chapter.id
          : topItem.kind === 'block'
          ? topItem.chapter.id
          : topItem.kind === 'part'
          ? // Part dividers belong to the next chapter (the one with that part label).
            allChapters.find(({ chapter }) => chapter.part === topItem.part.matchesChapterPart)
              ?.chapter.id ?? null
          : null;
      if (chId) setCurrentId((prev) => (prev === chId ? prev : chId));
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 0,
  }).current;

  const startRsvp = () => {
    close();
    setTimeout(() => setPickingRsvpStart(true), 220);
  };

  const cancelRsvpPick = () => setPickingRsvpStart(false);

  const beginRsvpAt = (chapterId: string, blockIdx: number) => {
    setPickingRsvpStart(false);
    setCurrentId(chapterId);
    setPendingRsvpStartIdx(blockIdx);
    requestAnimationFrame(() => setRsvpActive(true));
  };

  const handleRsvpExit = ({ idx, blockIdx }: { idx: number; blockIdx: number }) => {
    progressRef.current = {
      ...progressRef.current,
      rsvpByChapter: { ...progressRef.current.rsvpByChapter, [currentId]: idx },
    };
    saveProgress(progressRef.current);
    setRsvpActive(false);
    setPendingRsvpStartIdx(null);
    requestAnimationFrame(() => {
      const idxKey = `${currentId}-${blockIdx}`;
      const targetIdx = blockIndex[idxKey];
      if (typeof targetIdx === 'number') {
        listRef.current?.scrollToIndex({
          index: targetIdx,
          animated: true,
          viewOffset: 80,
        });
      }
    });
  };
  const chapter = CHAPTERS.find((c) => c.id === currentId) ?? CHAPTERS[0];
  const currentBlocks = useMemo(
    () => allChapters.find((c) => c.chapter.id === currentId)?.blocks ?? [],
    [allChapters, currentId],
  );

  // Animation values for the panels
  const tocScale = useSharedValue(0.02);
  const tocOpacity = useSharedValue(0);
  const settingsScale = useSharedValue(0.02);
  const settingsOpacity = useSharedValue(0);
  const askScale = useSharedValue(0.02);
  const askOpacity = useSharedValue(0);
  const searchScale = useSharedValue(0.02);
  const searchOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Keyboard height — used to lift the search sheet above the keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (e) =>
      setKeyboardHeight(e.endCoordinates?.height ?? 0),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const [settingsTab, setSettingsTab] = useState<'display' | 'reading' | 'audio' | 'profile'>(
    'display',
  );
  /** Bumps each time we want to (re)open the Profile auth accordion — passed
   *  through to ProfileSettings, which keys off the value to expand on change. */
  const [authOpenTrigger, setAuthOpenTrigger] = useState(0);
  const [redeemOpenTrigger, setRedeemOpenTrigger] = useState(0);

  const animateInto = (target: Sheet) => {
    const tween = (
      sv: typeof tocScale,
      ov: typeof tocOpacity,
      isTarget: boolean,
    ) => {
      sv.value = withTiming(isTarget ? 1 : 0.02, {
        duration: isTarget ? 280 : 200,
        easing: isTarget ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      });
      ov.value = withTiming(isTarget ? 1 : 0, { duration: isTarget ? 200 : 180 });
    };
    tween(tocScale, tocOpacity, target === 'toc');
    tween(settingsScale, settingsOpacity, target === 'settings');
    tween(askScale, askOpacity, target === 'ask');
    tween(searchScale, searchOpacity, target === 'search');
  };

  const open = (
    which: 'toc' | 'settings' | 'ask' | 'search',
    settingsInitial?: 'display' | 'reading' | 'audio' | 'profile',
    opts?: { authOpen?: boolean; redeemOpen?: boolean },
  ) => {
    if (which === 'settings' && settingsInitial) setSettingsTab(settingsInitial);
    else if (which === 'settings') setSettingsTab('display');
    if (which === 'settings' && opts?.authOpen) setAuthOpenTrigger((n) => n + 1);
    if (which === 'settings' && opts?.redeemOpen) setRedeemOpenTrigger((n) => n + 1);
    setSheet(which);
    setMounted(which);
    backdropOpacity.value = withTiming(1, { duration: 280 });
    animateInto(which);
  };

  const swap = (next: 'toc' | 'settings' | 'ask' | 'search') => {
    if (sheet === next) {
      close();
    } else {
      open(next);
    }
  };

  const close = () => {
    setSheet(null);
    backdropOpacity.value = withTiming(0, { duration: 200 });
    animateInto(null);
    setTimeout(() => setMounted(null), 220);
  };

  /**
   * Navigate to a chapter or to a specific (chapterId, blockIdx). Stores a
   * snapshot of the previous scroll position so the snapback pill can return
   * the user to where they were reading.
   */
  const handleNavigate = (id: string, blockIdx?: number) => {
    const targetIdx =
      typeof blockIdx === 'number'
        ? blockIndex[`${id}-${blockIdx}`]
        : chapterIndex[id];
    if (typeof targetIdx !== 'number') {
      close();
      return;
    }

    const fromIdx = topVisibleIndex.current;
    // Find which chapter the from-index belongs to so we can label the pill.
    let fromChapterId: string | null = null;
    for (let i = fromIdx; i >= 0; i--) {
      const it = items[i];
      if (it && (it.kind === 'chapter-header' || it.kind === 'block')) {
        fromChapterId = it.chapter.id;
        break;
      }
    }
    const fromChapter = fromChapterId
      ? CHAPTERS.find((c) => c.id === fromChapterId)
      : null;
    if (fromChapter && Math.abs(fromIdx - targetIdx) > 5) {
      setSnapshot({ index: fromIdx, label: fromChapter.title });
    }

    setCurrentId(id);
    close();
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({
        index: targetIdx,
        animated: false,
        viewOffset: 24,
      });
    });
  };

  const handleSnapBack = () => {
    if (!snapshot) return;
    const idx = snapshot.index;
    setSnapshot(null);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true });
    });
  };

  const dismissSnapshot = () => setSnapshot(null);

  const tocStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tocScale.value }],
    opacity: tocOpacity.value,
  }));
  const settingsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settingsScale.value }],
    opacity: settingsOpacity.value,
  }));
  const askStyle = useAnimatedStyle(() => ({
    transform: [{ scale: askScale.value }],
    opacity: askOpacity.value,
  }));
  const searchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.value }],
    opacity: searchOpacity.value,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeVisible.value,
    transform: [{ translateY: (1 - chromeVisible.value) * -90 }],
  }));

  const placeholder = (name: string) => () =>
    Alert.alert(name, 'Not wired up yet — coming soon.');

  if (!ready) {
    return <View className="flex-1" style={{ backgroundColor: tokens.bg }} />;
  }

  const bodyFont = fontFamily === 'serif' ? serif : 'System';
  // Fixed comfortable reading inset on mobile — width selector removed.
  const widthPx = 24;

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Ignorance Is Not Bliss',
        message:
          'Ignorance Is Not Bliss — Suffering, Purification and the Future of the Species, by Ethan Hill.\n\nhttps://iinb.yogawithethan.com/',
        url: 'https://iinb.yogawithethan.com/',
      });
    } catch {
      // user cancelled or platform error — silent.
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: tokens.bg }}>
      {/* Header — chrome floats freely (no banner). Slides up + fades on tap-toggle. */}
      <Animated.View
        pointerEvents={pickingRsvpStart ? 'none' : sheet ? 'auto' : undefined}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 56,
            paddingBottom: 12,
          },
          chromeStyle,
        ]}
      >
        <View className="flex-row" style={{ gap: 8 }}>
          <HeaderButton
            icon={sheet === 'toc' ? 'close' : 'list'}
            label={sheet === 'toc' ? 'Close contents' : 'Table of contents'}
            active={sheet === 'toc'}
            dimmed={Boolean(sheet) && sheet !== 'toc'}
            onPress={() => swap('toc')}
          />
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <HeaderButton
            icon={sheet === 'settings' ? 'close' : 'settings-outline'}
            label={sheet === 'settings' ? 'Close settings' : 'Settings'}
            active={sheet === 'settings'}
            dimmed={Boolean(sheet) && sheet !== 'settings'}
            onPress={() => swap('settings')}
          />
          <HeaderButton
            icon={sheet === 'ask' ? 'close' : 'sparkles-outline'}
            label={sheet === 'ask' ? 'Close Ask the book' : 'Ask the book'}
            active={sheet === 'ask'}
            dimmed={Boolean(sheet) && sheet !== 'ask'}
            onPress={() => swap('ask')}
          />
        </View>
      </Animated.View>

      {/* Floating bottom-right utilities — search + share. Hidden entirely
          while any sheet/paywall is open so they don't crowd the active panel. */}
      {!sheet && !paywallOpen && !pickingRsvpStart ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          style={[
            {
              position: 'absolute',
              right: 16,
              // The reader's container sits inside Tabs.Screen, so bottom:0 is
              // the top of the tab bar. When the CTA bar is visible (non-buyers),
              // hop above it; otherwise tuck just above the tab bar.
              bottom: purchased ? 16 : 104,
              zIndex: 21,
              flexDirection: 'row',
              gap: 8,
            },
            chromeStyle,
          ]}
        >
          <HeaderButton
            icon="search-outline"
            label="Search"
            onPress={() => swap('search')}
          />
          <HeaderButton
            icon="share-outline"
            label="Share"
            onPress={handleShare}
          />
        </Animated.View>
      ) : null}

      <FlashList
        ref={listRef}
        data={items}
        extraData={{ pickingRsvpStart, rewrites, refreshLoadingKey, spanRewrites, spanLoadingKey, fontSize, bionicReading, accent, glossaryTerm }}
        keyExtractor={readerKeyExtractor}
        getItemType={readerItemType}
        initialScrollIndex={initialScrollIndex.current || undefined}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={{
          paddingHorizontal: widthPx,
          paddingTop: 110,
          paddingBottom: 64,
        }}
        onTouchStart={(e) => {
          const t = e.nativeEvent.touches[0];
          if (!t) return;
          touchStart.current = {
            x: t.pageX,
            y: t.pageY,
            t: Date.now(),
            scrolled: false,
          };
        }}
        onScrollBeginDrag={() => {
          if (touchStart.current) touchStart.current.scrolled = true;
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          // RSVP-pick mode handles its own taps via per-block Pressable.
          if (pickingRsvpStart) return;
          if (!start || start.scrolled) return;
          const elapsed = Date.now() - start.t;
          if (elapsed > 300) return;
          const t = e.nativeEvent.changedTouches[0];
          if (!t) return;
          const dx = Math.abs(t.pageX - start.x);
          const dy = Math.abs(t.pageY - start.y);
          if (dx > 8 || dy > 8) return;
          toggleChrome();
        }}
        renderItem={({ item }) => {
          if (item.kind === 'dedication') {
            return (
              <View
                style={{
                  minHeight: windowHeight - tabBarHeight - 160,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 40,
                  paddingHorizontal: 20,
                }}
              >
                <Text
                  style={{
                    fontFamily: serifItalic,
                    fontSize: fontSize + 1,
                    lineHeight: (fontSize + 1) * 1.6,
                    color: tokens.inkSecondary,
                    textAlign: 'center',
                    letterSpacing: 0.3,
                  }}
                >
                  {dedicationJson.body
                    .split(/\n\s*\n/)
                    .map((line) => line.trim())
                    .join('\n')}
                </Text>
              </View>
            );
          }

          if (item.kind === 'part') {
            return (
              <PartDivider
                part={item.part}
                bodyFont={bodyFont}
                italicFamily={fontFamily === 'serif' ? serifItalic : 'System'}
                fontSize={fontSize}
                ink={tokens.ink}
                inkSecondary={tokens.inkSecondary}
                inkTertiary={tokens.inkTertiary}
                accent={accent}
                minHeight={windowHeight - tabBarHeight - 80}
              />
            );
          }

          if (item.kind === 'chapter-header') {
            return (
              <View
                style={{
                  marginBottom: 28,
                  marginTop: item.isFirst ? 8 : item.afterPart ? 0 : 24,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: bodyFont,
                    fontSize: fontSize + 14,
                    lineHeight: (fontSize + 14) * 1.2,
                    color: tokens.ink,
                    textAlign: 'center',
                  }}
                >
                  {item.chapter.title}
                </Text>
                {item.chapter.subtitle ? (
                  <Text
                    style={{
                      fontFamily: serifItalic,
                      fontStyle: 'italic',
                      fontSize: fontSize + 2,
                      marginTop: 8,
                      color: tokens.inkSecondary,
                      textAlign: 'center',
                    }}
                  >
                    {item.chapter.subtitle}
                  </Text>
                ) : null}
              </View>
            );
          }

          // block
          const blockKey = `${item.chapter.id}-${item.blockIdx}`;
          const blockSpanRewrites: Record<number, string> = {};
          const blockKeyPrefix = `${blockKey}-`;
          for (const k of Object.keys(spanRewrites)) {
            if (k.startsWith(blockKeyPrefix)) {
              const spanIdx = Number(k.slice(blockKeyPrefix.length));
              if (!Number.isNaN(spanIdx)) blockSpanRewrites[spanIdx] = spanRewrites[k];
            }
          }
          const blockSpanLoadingIdx =
            spanLoadingKey && spanLoadingKey.startsWith(blockKeyPrefix)
              ? Number(spanLoadingKey.slice(blockKeyPrefix.length))
              : null;
          const blockBody = (
            <BlockRenderer
              block={item.block}
              chapterId={item.chapter.id}
              blockIdx={item.blockIdx}
              fontSize={fontSize}
              fontFamily={bodyFont}
              italicFamily={fontFamily === 'serif' ? serifItalic : 'System'}
              ink={tokens.ink}
              inkSecondary={tokens.inkSecondary}
              inkTertiary={tokens.inkTertiary}
              accent={accent}
              bionic={bionicReading}
              onRefresh={
                user
                  ? () =>
                      refreshParagraphAt(item.chapter.id, item.blockIdx, item.block.text)
                  : undefined
              }
              rewrittenText={rewrites[blockKey]}
              onRevert={() => revertParagraphAt(item.chapter.id, item.blockIdx)}
              refreshLoading={refreshLoadingKey === blockKey}
              onGlossaryTap={(term) => setGlossaryTerm(term)}
              spanRewrites={blockSpanRewrites}
              spanLoadingIdx={blockSpanLoadingIdx}
              onRefreshSpan={
                user
                  ? (spanIdx, original, paragraph) =>
                      refreshSpanAt(item.chapter.id, item.blockIdx, spanIdx, original, paragraph)
                  : undefined
              }
              onRevertSpan={(spanIdx) =>
                revertSpanAt(item.chapter.id, item.blockIdx, spanIdx)
              }
            />
          );
          const wrapperStyle = {
            // Add bottom spacing after the last block of each chapter so chapters
            // don't run into one another when virtualized.
            marginBottom: item.isLast ? fontSize * 3 : 0,
            ...(pickingRsvpStart
              ? {
                  borderLeftWidth: 2,
                  borderLeftColor: withAlpha(accent, 0.55),
                  paddingLeft: 12,
                  marginLeft: -14,
                }
              : null),
          };
          if (pickingRsvpStart) {
            return (
              <Pressable
                onPress={() => beginRsvpAt(item.chapter.id, item.blockIdx)}
                style={wrapperStyle}
              >
                {blockBody}
              </Pressable>
            );
          }
          return <View style={wrapperStyle}>{blockBody}</View>;
        }}
      />

      {/* Backdrop — blurred + darkened so the floating header buttons pop. */}
      {mounted ? (
        <Animated.View
          pointerEvents="auto"
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            backdropStyle,
          ]}
        >
          <BlurView
            intensity={45}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Light scrim only — most of the dark comes from BlurView's tint.
              If the BlurView isn't rendering for some reason, this fallback
              still gives a darkened backdrop. */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          />
          <Pressable
            onPress={close}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </Animated.View>
      ) : null}

      {/* TOC sheet — anchored top-left (TOC button) */}
      <Animated.View
        pointerEvents={mounted === 'toc' && sheet === 'toc' ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            top: PANEL_TOP,
            left: 12,
            right: 12,
            height: panelMaxHeight,
            backgroundColor: tokens.bg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
            overflow: 'hidden',
            transformOrigin: 'top left',
          },
          tocStyle,
        ]}
      >
        <TocPanel
          currentId={currentId}
          onNavigate={handleNavigate}
          isAuthed={isAuthed}
          onLockedTap={(tier) => {
            close();
            if (tier === 'requires-signin') {
              setTimeout(() => open('settings', 'profile', { authOpen: true }), 220);
            } else {
              setTimeout(() => setPaywallOpen(true), 220);
            }
          }}
        />
      </Animated.View>

      {/* Settings sheet — anchored top-right, auto-sized to active tab content */}
      <Animated.View
        pointerEvents={mounted === 'settings' && sheet === 'settings' ? 'auto' : 'none'}
        layout={LinearTransition.springify().damping(14).stiffness(220).mass(0.5)}
        style={[
          {
            position: 'absolute',
            top: PANEL_TOP,
            left: 12,
            right: 12,
            maxHeight: panelMaxHeight,
            backgroundColor: tokens.bg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
            overflow: 'hidden',
            transformOrigin: 'top right',
          },
          settingsStyle,
        ]}
      >
        <SettingsPanel
          onStartRsvp={startRsvp}
          initialTab={settingsTab}
          authOpenTrigger={authOpenTrigger}
          redeemOpenTrigger={redeemOpenTrigger}
        />
      </Animated.View>

      {/* Ask the book sheet — anchored top-right (sparkle button), full panel height */}
      <Animated.View
        pointerEvents={mounted === 'ask' && sheet === 'ask' ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            top: PANEL_TOP,
            left: 12,
            right: 12,
            height: panelMaxHeight,
            backgroundColor: tokens.bg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
            overflow: 'hidden',
            transformOrigin: 'top right',
          },
          askStyle,
        ]}
      >
        <AskPanel
          chapterId={currentId}
          isAuthed={isAuthed}
          purchased={purchased}
          onClose={close}
          onSignInRequired={() => {
            close();
            setTimeout(() => open('settings', 'profile', { authOpen: true }), 220);
          }}
          onPurchaseRequired={() => {
            close();
            setTimeout(() => setPaywallOpen(true), 220);
          }}
        />
      </Animated.View>

      {/* Search sheet — bottom-anchored. Materializes as a compact input bar
          that the SearchPanel's own LinearTransition grows upward into a
          results panel as the user types. Lifted above the keyboard. */}
      <Animated.View
        pointerEvents={mounted === 'search' && sheet === 'search' ? 'auto' : 'none'}
        style={[
          {
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: keyboardHeight > 0 ? keyboardHeight - tabBarHeight + 8 : 16,
            // When the keyboard is up the panel is anchored above it, so the
            // available vertical space shrinks by (keyboardHeight - tabBarHeight).
            // Without this the panel can run past the top of the screen.
            maxHeight:
              keyboardHeight > 0
                ? Math.max(220, panelMaxHeight - (keyboardHeight - tabBarHeight))
                : panelMaxHeight,
            backgroundColor: tokens.bg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 12,
            overflow: 'hidden',
            transformOrigin: 'bottom right',
          },
          searchStyle,
        ]}
      >
        <SearchPanel
          onJump={handleNavigate}
          onClose={close}
          resultsMaxHeight={
            (keyboardHeight > 0
              ? Math.max(220, panelMaxHeight - (keyboardHeight - tabBarHeight))
              : panelMaxHeight) - 80
          }
          visible={mounted === 'search' && sheet === 'search'}
        />
      </Animated.View>

      {rsvpActive ? (
        <RsvpOverlay
          blocks={currentBlocks}
          chapterTitle={chapter.title}
          startIdx={progressRef.current.rsvpByChapter[currentId] ?? 0}
          startBlockIdx={pendingRsvpStartIdx ?? undefined}
          onExit={handleRsvpExit}
        />
      ) : null}

      {/* Apple Books-style "Back to…" pill — appears after a TOC jump,
          dismisses on tap (returns) or via the × on a new jump. */}
      {snapshot && !sheet ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(160)}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: !purchased ? 76 : 24,
            alignItems: 'center',
            zIndex: 30,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingLeft: 14,
              paddingRight: 6,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: tokens.bg,
              borderWidth: 1,
              borderColor: tokens.pillBorder,
              shadowColor: '#000',
              shadowOpacity: 0.16,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Pressable
              onPress={handleSnapBack}
              accessibilityLabel={`Back to ${snapshot.label}`}
              className="flex-row items-center active:opacity-60"
              style={{ gap: 8, paddingVertical: 4, paddingRight: 4 }}
            >
              <Ionicons name="arrow-undo" size={14} color={accent} />
              <Text style={{ fontFamily: serifItalic, fontSize: 14, color: tokens.ink }}>
                Back to{' '}
                <Text style={{ color: accent, fontWeight: '600' }}>{snapshot.label}</Text>
              </Text>
            </Pressable>
            <Pressable
              onPress={dismissSnapshot}
              accessibilityLabel="Dismiss"
              className="h-6 w-6 items-center justify-center rounded-full active:opacity-60"
              style={{ backgroundColor: withAlpha(tokens.ink, 0.06) }}
            >
              <Ionicons name="close" size={11} color={tokens.inkTertiary} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* Backdrop for the expanded paywall — shared blur+dim with the other sheets. */}
      {paywallOpen ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(180)}
          pointerEvents="auto"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 24,
          }}
        >
          <BlurView
            intensity={45}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          />
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setPaywallOpen(false)}
          />
        </Animated.View>
      ) : null}

      {/* Bottom CTA — single Animated.View bottom-anchored. As content
          inside grows, height increases and the layout animation springs the
          top edge upward; the bottom stays pinned. */}
      {ready && !purchased && !sheet && !rsvpActive && !pickingRsvpStart ? (
          <Animated.View
            pointerEvents="auto"
            layout={LinearTransition.springify().damping(20).stiffness(220).mass(0.5)}
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              // Sit just above the tab bar with a slight gap. The tab bar
              // already includes the bottom safe-area inset, so this keeps
              // the card visually anchored to the bottom on all devices.
              bottom: tabBarHeight + 6,
              zIndex: 25,
              borderRadius: 18,
              overflow: 'hidden',
              backgroundColor: tokens.bg,
              borderWidth: 1,
              borderColor: withAlpha(accent, 0.45),
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 14,
              shadowColor: '#000',
              shadowOpacity: 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            {/* Title row — identical React tree in both states. */}
            <Pressable
              onPress={
                paywallOpen
                  ? undefined
                  : () => {
                      if (isAuthed) setPaywallOpen(true);
                      else open('settings', 'profile', { authOpen: true });
                    }
              }
              disabled={paywallOpen}
              accessibilityLabel={
                isAuthed && !paywallOpen
                  ? 'See what you get with purchase'
                  : !isAuthed
                  ? 'Sign up to keep reading'
                  : 'Ignorance Is Not Bliss'
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                {isAuthed || paywallOpen ? (
                  <>
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 17,
                        color: tokens.ink,
                        fontWeight: '600',
                      }}
                    >
                      Ignorance Is Not Bliss
                    </Text>
                    <Text
                      style={{
                        fontFamily: serifItalic,
                        fontSize: 13,
                        color: tokens.inkSecondary,
                        marginTop: 2,
                      }}
                    >
                      Ethan Hill
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 17,
                        color: tokens.ink,
                        fontWeight: '600',
                      }}
                    >
                      Want more?
                    </Text>
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 13,
                        color: tokens.inkSecondary,
                        lineHeight: 17,
                        marginTop: 2,
                      }}
                    >
                      Sign up to read the next{'\n'}two chapters free.
                    </Text>
                  </>
                )}
              </View>

              {/* Right-side control — instant swap, no fade. */}
              {paywallOpen ? (
                <Pressable
                  onPress={() => setPaywallOpen(false)}
                  accessibilityLabel="Close"
                  style={{
                    height: 32,
                    width: 32,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: tokens.pillBorder,
                  }}
                >
                  <Ionicons name="close" size={14} color={tokens.ink} />
                </Pressable>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 999,
                    backgroundColor: accent,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: 15,
                      fontWeight: '700',
                      color: '#ffffff',
                    }}
                  >
                    {isAuthed ? 'Buy · $22' : 'Sign up'}
                  </Text>
                  {!isAuthed ? (
                    <Ionicons name="arrow-forward" size={14} color="#ffffff" />
                  ) : null}
                </View>
              )}
            </Pressable>

            {/* Below the title — only present when expanded. */}
            {paywallOpen && isAuthed ? (
              <View style={{ marginTop: 16 }}>
                <View style={{ gap: 14 }}>
                  {FEATURES.map((f) => (
                    <View key={f.title} style={{ flexDirection: 'row', gap: 12 }}>
                      <View
                        style={{
                          height: 32,
                          width: 32,
                          borderRadius: 999,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: withAlpha(accent, 0.18),
                          marginTop: 1,
                        }}
                      >
                        <Ionicons name={f.icon} size={14} color={accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: serif,
                            fontSize: 14,
                            fontWeight: '600',
                            color: tokens.ink,
                          }}
                        >
                          {f.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: serif,
                            fontSize: 12,
                            color: tokens.inkSecondary,
                            marginTop: 2,
                            lineHeight: 16,
                          }}
                        >
                          {f.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={handleBuyFullBook}
                  disabled={purchasingFullBook}
                  accessibilityLabel="Buy for $22"
                  className="active:opacity-80"
                  style={{
                    marginTop: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 16,
                    borderRadius: 999,
                    backgroundColor: accent,
                    opacity: purchasingFullBook ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#ffffff',
                    }}
                  >
                    {purchasingFullBook ? 'Purchasing…' : 'Buy · $22'}
                  </Text>
                </Pressable>

                {/* "Have a code?" — only visible when the paywall is expanded,
                    sitting just below the Buy button as a quieter alternative. */}
                <Pressable
                  onPress={() => {
                    setPaywallOpen(false);
                    open('settings', 'profile', { redeemOpen: true });
                  }}
                  accessibilityLabel="Redeem a code"
                  className="active:opacity-60"
                  style={{
                    marginTop: 10,
                    alignSelf: 'center',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Ionicons name="key-outline" size={11} color={tokens.inkSecondary} />
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: 12,
                      color: tokens.inkSecondary,
                      textDecorationLine: 'underline',
                    }}
                  >
                    Have a code? Redeem it
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
      ) : null}

      {/* RSVP focus mode — vignettes that frame the reading area when the
          user is picking a paragraph. Top + bottom gradients fade in to dim
          the chrome zones, leaving the paragraphs spotlighted in the middle. */}
      {pickingRsvpStart ? (
        <>
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: insets.top + 140,
              zIndex: 22,
            }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0)']}
              style={{ flex: 1 }}
            />
          </Animated.View>
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(180)}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: tabBarHeight + 140,
              zIndex: 22,
            }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </>
      ) : null}

      {/* RSVP "tap a paragraph" banner. */}
      {pickingRsvpStart ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(140)}
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + 12,
            left: 12,
            right: 12,
            zIndex: 26,
            alignItems: 'center',
          }}
        >
          <View
            pointerEvents="auto"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingLeft: 16,
              paddingRight: 6,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: tokens.bg,
              borderWidth: 1,
              borderColor: withAlpha(accent, 0.45),
              shadowColor: '#000',
              shadowOpacity: 0.16,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Ionicons name="play" size={13} color={accent} />
            <Text
              style={{
                fontFamily: serifItalic,
                fontSize: 13,
                color: tokens.ink,
              }}
            >
              Tap a paragraph to begin
            </Text>
            <Pressable
              onPress={cancelRsvpPick}
              accessibilityLabel="Cancel"
              className="h-7 w-7 items-center justify-center rounded-full active:opacity-60"
              style={{ backgroundColor: withAlpha(tokens.ink, 0.06), marginLeft: 4 }}
            >
              <Ionicons name="close" size={11} color={tokens.inkTertiary} />
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {/* Glossary popup — centered modal with blurred + dimmed backdrop.
          Surfaced from BlockRenderer's onGlossaryTap so the card sits above
          everything and isn't lost below a long paragraph. */}
      {glossaryTerm
        ? (() => {
            const entry = findGlossaryEntry(glossaryTerm);
            if (!entry) return null;
            return (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 40,
                }}
              >
                <Animated.View
                  entering={FadeIn.duration(160)}
                  exiting={FadeOut.duration(140)}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                  <BlurView
                    intensity={45}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.25)',
                    }}
                  />
                  <Pressable
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    onPress={() => setGlossaryTerm(null)}
                  />
                </Animated.View>
                <Animated.View
                  entering={FadeIn.duration(180)}
                  exiting={FadeOut.duration(140)}
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                  }}
                >
                  <View
                    pointerEvents="auto"
                    style={{
                      width: '100%',
                      maxWidth: 460,
                    }}
                  >
                    <GlossaryCard
                      entry={entry as Parameters<typeof GlossaryCard>[0]['entry']}
                      onClose={() => setGlossaryTerm(null)}
                      onRefreshDefinition={() => undefined}
                      onRefreshContext={() => undefined}
                    />
                  </View>
                </Animated.View>
              </View>
            );
          })()
        : null}

      {ready && purchased && !onboarded ? <Onboarding /> : null}

      {/* First-launch onboarding takes priority over everything else. Sits at
          the highest zIndex so it covers the reader, sheets, and CTAs. */}
      {ready && !firstLaunched ? <FirstLaunchOnboarding /> : null}
    </View>
  );
}
