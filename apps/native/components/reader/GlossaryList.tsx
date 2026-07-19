import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import glossary from '@/content/glossary.json';
import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';

type Entry = {
  term: string;
  display: string;
  lang: string;
  pronunciation: string;
  definition: string;
  example?: string;
  used_in_sentence?: string;
  chapter: number;
  order: number;
  also_see?: string[];
};

const ENTRIES = glossary as Entry[];
const BY_TERM = new Map(ENTRIES.map((e) => [e.term.toLowerCase(), e]));

type Group = { chapter: number; items: Entry[] };

function buildGroups(): Group[] {
  const map = new Map<number, Entry[]>();
  for (const e of ENTRIES) {
    if (!map.has(e.chapter)) map.set(e.chapter, []);
    map.get(e.chapter)!.push(e);
  }
  const out: Group[] = [];
  for (const [chapter, items] of map) {
    items.sort((a, b) => a.order - b.order);
    out.push({ chapter, items });
  }
  out.sort((a, b) => a.chapter - b.chapter);
  return out;
}

export function GlossaryList() {
  const { tokens } = useSettings();
  const groups = useMemo(buildGroups, []);
  const [openTerm, setOpenTerm] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const rowYs = useRef<Record<string, number>>({});

  const handleToggle = (term: string) => {
    setOpenTerm((prev) => (prev === term ? null : term));
  };

  const handleSeeAlso = (term: string) => {
    setOpenTerm(term);
    // Defer the scroll until after layout settles.
    requestAnimationFrame(() => {
      const y = rowYs.current[term];
      if (typeof y === 'number') {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
    });
  };

  return (
    <ScrollShadow
      LinearGradientComponent={LinearGradient}
      color={tokens.bg}
      size={28}
      className="flex-1"
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8"
      >
        {groups.map((g) => (
          <View key={`ch-${g.chapter}`} style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 11,
                letterSpacing: 1.6,
                color: tokens.inkTertiary,
                marginBottom: 8,
                paddingHorizontal: 4,
              }}
            >
              {`CHAPTER ${g.chapter}`}
            </Text>

            <Animated.View
              layout={LinearTransition.springify().damping(16).stiffness(220).mass(0.5)}
              style={{ gap: 10 }}
            >
              {g.items.map((entry) => (
                <View
                  key={entry.term}
                  onLayout={(e) => {
                    rowYs.current[entry.term] = e.nativeEvent.layout.y;
                  }}
                >
                  <GlossaryRow
                    entry={entry}
                    open={openTerm === entry.term}
                    onToggle={() => handleToggle(entry.term)}
                    onSeeAlso={handleSeeAlso}
                  />
                </View>
              ))}
            </Animated.View>
          </View>
        ))}
      </ScrollView>
    </ScrollShadow>
  );
}

function GlossaryRow({
  entry,
  open,
  onToggle,
  onSeeAlso,
}: {
  entry: Entry;
  open: boolean;
  onToggle: () => void;
  onSeeAlso: (term: string) => void;
}) {
  const { tokens, accent } = useSettings();
  const example = entry.example ?? entry.used_in_sentence ?? '';
  const seeAlso =
    entry.also_see
      ?.map((t) => BY_TERM.get(t.toLowerCase()))
      .filter((e): e is Entry => Boolean(e)) ?? [];

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(16).stiffness(220).mass(0.5)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: open ? withAlpha(accent, 0.06) : 'transparent',
        borderWidth: 1,
        borderColor: open ? withAlpha(accent, 0.45) : tokens.pillBorder,
      }}
    >
      {/* Header — always visible, acts as toggle */}
      <Pressable
        onPress={onToggle}
        accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${entry.display}`}
        className="flex-row items-center justify-between active:opacity-70"
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: open ? withAlpha(accent, 0.08) : 'transparent',
        }}
      >
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 18,
            color: open ? accent : tokens.ink,
          }}
        >
          {entry.display}
        </Text>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Text
            style={{
              fontFamily: serif,
              fontSize: 10,
              letterSpacing: 1.4,
              color: open ? accent : tokens.inkTertiary,
              fontWeight: '600',
            }}
          >
            {entry.lang.toUpperCase()}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={open ? accent : tokens.inkTertiary}
          />
        </View>
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(180).easing(Easing.out(Easing.cubic))}
          exiting={FadeOut.duration(140)}
          style={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4, gap: 10 }}
        >
          {entry.pronunciation ? (
            <View>
              <SectionHeader>Pronounce</SectionHeader>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text style={{ fontFamily: serif, fontSize: 14, color: tokens.ink }}>
                  {entry.pronunciation}
                </Text>
                <SmallIconButton icon="volume-high" disabled accessibilityLabel="Pronounce" />
              </View>
            </View>
          ) : null}

          {entry.pronunciation ? <Divider /> : null}

          <View>
            <SectionHeader>Definition</SectionHeader>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 14,
                lineHeight: 20,
                color: tokens.ink,
              }}
            >
              {entry.definition}
            </Text>
          </View>

          {example ? (
            <>
              <Divider />
              <View>
                <SectionHeader>In context</SectionHeader>
                <Text
                  style={{
                    fontFamily: serifItalic,
                    fontSize: 14,
                    lineHeight: 20,
                    color: tokens.inkSecondary,
                  }}
                >
                  {example}
                </Text>
              </View>
            </>
          ) : null}

          {seeAlso.length > 0 ? (
            <>
              <Divider />
              <View>
                <SectionHeader>See also</SectionHeader>
                <View className="flex-row flex-wrap" style={{ gap: 6 }}>
                  {seeAlso.map((rel) => (
                    <Pressable
                      key={rel.term}
                      onPress={() => onSeeAlso(rel.term)}
                      className="active:opacity-70"
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: withAlpha(accent, 0.12),
                        borderWidth: 1,
                        borderColor: withAlpha(accent, 0.35),
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: serifItalic,
                          fontSize: 13,
                          color: accent,
                        }}
                      >
                        {rel.display}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  const { tokens } = useSettings();
  return (
    <Text
      style={{
        fontFamily: serif,
        fontSize: 10,
        letterSpacing: 1.4,
        color: tokens.inkTertiary,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}
    >
      {children}
    </Text>
  );
}

function Divider() {
  const { tokens } = useSettings();
  return <View style={{ height: 1, backgroundColor: tokens.pillBorder }} />;
}

function SmallIconButton({
  icon,
  disabled,
  accessibilityLabel,
  onPress,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  disabled?: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
}) {
  const { accent } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={{
        height: 24,
        width: 24,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(accent, 0.18),
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Ionicons name={icon} size={12} color={accent} />
    </Pressable>
  );
}
