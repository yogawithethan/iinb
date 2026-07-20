import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import chapters from '@/content/chapters.json';
import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import { parseBlocks, type Block } from '@/lib/blocks';

type Chapter = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  body: string;
};

type Hit = {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  blockIdx: number;
  block: Block;
  matches: { start: number; end: number }[];
};

const CHAPTERS = chapters as Chapter[];

const ALL_BLOCKS = (() => {
  const out: { chapter: Chapter; blocks: Block[] }[] = [];
  for (const c of CHAPTERS) {
    out.push({ chapter: c, blocks: parseBlocks(c.body) });
  }
  return out;
})();

const MAX_HITS = 60;

// Fold curly quotes, dashes, and ellipsis to ASCII so a user typing a straight
// apostrophe still matches text authored with typographic punctuation. Length
// is preserved so match offsets stay valid against the original string.
function normalize(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '.')
    // ZWSPs are inserted after em-dashes by parseBlocks to fix iOS wrapping.
    // Map them to a regular space so the haystack still matches user queries
    // and snippet offsets stay aligned (length-preserving 1:1 swap).
    .replace(/​/g, ' ');
}

function findMatches(haystack: string, needle: string): { start: number; end: number }[] {
  if (!needle) return [];
  const out: { start: number; end: number }[] = [];
  const lower = normalize(haystack).toLowerCase();
  const q = normalize(needle).toLowerCase();
  let i = 0;
  while (i < lower.length) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) break;
    out.push({ start: idx, end: idx + q.length });
    i = idx + q.length;
    if (out.length > 5) break;
  }
  return out;
}

type Props = {
  onJump: (chapterId: string) => void;
  onClose: () => void;
  /** Max height the results scroll can take. */
  resultsMaxHeight: number;
  /** True when the search sheet is open. Drives the auto-focus so it only
   *  fires when the panel becomes visible — not on app launch. */
  visible?: boolean;
};

export function SearchPanel({ onJump, onClose, resultsMaxHeight, visible }: Props) {
  const { tokens, accent } = useSettings();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Defer focus a tick so it lands after the open animation begins.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    inputRef.current?.blur();
  }, [visible]);

  const hits: Hit[] = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const out: Hit[] = [];
    for (const { chapter, blocks } of ALL_BLOCKS) {
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const matches = findMatches(b.text, q);
        if (matches.length > 0) {
          out.push({
            chapterId: chapter.id,
            chapterTitle: chapter.title,
            chapterOrder: chapter.order,
            blockIdx: i,
            block: b,
            matches,
          });
          if (out.length >= MAX_HITS) return out;
        }
      }
    }
    return out;
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Hit[]>();
    for (const h of hits) {
      const arr = map.get(h.chapterId) ?? [];
      arr.push(h);
      map.set(h.chapterId, arr);
    }
    return Array.from(map.entries())
      .map(([id, items]) => ({
        id,
        items,
        title: items[0].chapterTitle,
        order: items[0].chapterOrder,
      }))
      .sort((a, b) => a.order - b.order);
  }, [hits]);

  const totalCount = hits.length;
  const showResults = query.trim().length >= 2;

  return (
    <Animated.View
      // Spring the panel's height as the results section mounts/unmounts.
      layout={LinearTransition.springify().damping(22).stiffness(260).mass(0.45)}
    >
      {showResults ? (
        <View
          style={{
            paddingTop: 12,
            paddingHorizontal: 4,
            paddingBottom: 4,
          }}
        >
          {totalCount === 0 ? (
            <Text
              style={{
                fontFamily: serif,
                fontSize: 14,
                color: tokens.inkSecondary,
                paddingHorizontal: 14,
                paddingVertical: 16,
              }}
            >
              No matches for{' '}
              <Text style={{ fontFamily: serifItalic, color: tokens.ink }}>{query}</Text>.
            </Text>
          ) : (
            <ScrollShadow
              LinearGradientComponent={LinearGradient}
              color={tokens.bg}
              size={20}
              style={{ maxHeight: resultsMaxHeight - 16 }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: resultsMaxHeight - 16 }}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
              >
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    color: tokens.inkTertiary,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                    paddingHorizontal: 4,
                  }}
                >
                  {totalCount === MAX_HITS
                    ? `${MAX_HITS}+ matches`
                    : `${totalCount} match${totalCount === 1 ? '' : 'es'}`}
                </Text>
                {grouped.map((g) => (
                  <View key={g.id} style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontFamily: serifItalic,
                        fontSize: 12,
                        color: tokens.inkSecondary,
                        marginBottom: 6,
                        paddingHorizontal: 4,
                      }}
                    >
                      {g.title}
                    </Text>
                    <View style={{ gap: 6 }}>
                      {g.items.map((h, i) => (
                        <Pressable
                          key={`${g.id}-${h.blockIdx}-${i}`}
                          onPress={() => onJump(g.id)}
                          className="rounded-xl px-3 py-2 active:opacity-70"
                          style={{
                            borderWidth: 1,
                            borderColor: tokens.pillBorder,
                            backgroundColor: tokens.bg,
                          }}
                        >
                          <Snippet
                            text={h.block.text}
                            match={h.matches[0]}
                            accent={accent}
                            ink={tokens.ink}
                            inkSecondary={tokens.inkSecondary}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </ScrollShadow>
          )}

          {/* Divider between results and input bar. */}
          <View
            style={{
              height: 1,
              backgroundColor: tokens.pillBorder,
              marginHorizontal: 8,
              marginTop: 4,
            }}
          />
        </View>
      ) : null}

      {/* Search input bar — always present. Materializes when the panel mounts. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          margin: 8,
          borderRadius: 14,
          backgroundColor: tokens.bgSoft,
          borderWidth: 1,
          borderColor: tokens.pillBorder,
        }}
      >
        <Ionicons name="search" size={15} color={tokens.inkTertiary} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search the book"
          placeholderTextColor={tokens.inkTertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            fontFamily: serif,
            fontSize: 14,
            color: tokens.ink,
            padding: 0,
          }}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear" hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={tokens.inkTertiary} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function Snippet({
  text,
  match,
  accent,
  ink,
  inkSecondary,
}: {
  text: string;
  match: { start: number; end: number };
  accent: string;
  ink: string;
  inkSecondary: string;
}) {
  const PAD = 50;
  const start = Math.max(0, match.start - PAD);
  const end = Math.min(text.length, match.end + PAD);
  const before = (start > 0 ? '… ' : '') + text.slice(start, match.start);
  const hit = text.slice(match.start, match.end);
  const after = text.slice(match.end, end) + (end < text.length ? ' …' : '');

  return (
    <Text
      numberOfLines={3}
      style={{
        fontFamily: serif,
        fontSize: 13,
        lineHeight: 18,
        color: ink,
      }}
    >
      <Text style={{ color: inkSecondary }}>{before}</Text>
      <Text style={{ color: accent, fontWeight: '700', backgroundColor: withAlpha(accent, 0.14) }}>
        {hit}
      </Text>
      <Text style={{ color: inkSecondary }}>{after}</Text>
    </Text>
  );
}
