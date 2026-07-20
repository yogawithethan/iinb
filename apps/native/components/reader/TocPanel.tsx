import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import chapters from '@/content/chapters.json';
import parts from '@/content/parts.json';

import { GlossaryList } from './GlossaryList';
import { chapterTier, type AccessTier } from '@/lib/access';

type Chapter = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  part: string;
  isFree: boolean;
};

type Props = {
  currentId: string;
  onNavigate: (id: string) => void;
  /** True when the user is signed in (real or simulated dev toggle). */
  isAuthed: boolean;
  /** Called when the user taps a chapter they don't have access to. */
  onLockedTap?: (tier: AccessTier) => void;
};

type Part = {
  id: string;
  order: number;
  numeral: string;
  title: string;
  matchesChapterPart: string;
};

const CHAPTERS = chapters as Chapter[];
const PARTS = parts as Part[];

type Group = { partLabel: string; part: Part | null; items: Chapter[] };

function buildGroups(): Group[] {
  const groups: Group[] = [];
  for (const c of CHAPTERS) {
    const key = c.part ?? '';
    let group = groups.find((g) => g.partLabel === key);
    if (!group) {
      const part = PARTS.find((p) => p.matchesChapterPart === key) ?? null;
      group = { partLabel: key, part, items: [] };
      groups.push(group);
    }
    group.items.push(c);
  }
  return groups;
}

type Tab = 'contents' | 'glossary';

export function TocPanel({ currentId, onNavigate, isAuthed, onLockedTap }: Props) {
  const [tab, setTab] = useState<Tab>('contents');
  const groups = useMemo(buildGroups, []);
  const { tokens, accent, purchased } = useSettings();

  return (
    <View className="flex-1">
      <View className="px-4 pt-4">
        <PillSwitcher tab={tab} onChange={setTab} />
      </View>

      {tab === 'contents' ? (
        <ScrollShadow
          LinearGradientComponent={LinearGradient}
          color={tokens.bg}
          size={28}
          className="flex-1"
        >
        <ScrollView className="flex-1" contentContainerClassName="px-4 pt-4 pb-8">
          {groups.map((g, gi) => (
            <View key={g.partLabel || `free-${gi}`} className="mb-5">
              {g.part ? (
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 11,
                    letterSpacing: 1.6,
                    color: tokens.inkTertiary,
                    marginBottom: 8,
                    paddingHorizontal: 8,
                  }}
                >
                  {g.part.numeral.toUpperCase()} · {g.part.title.toUpperCase()}
                </Text>
              ) : g.partLabel ? (
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 11,
                    letterSpacing: 1.6,
                    color: tokens.inkTertiary,
                    marginBottom: 8,
                    paddingHorizontal: 8,
                  }}
                >
                  {g.partLabel.toUpperCase()}
                </Text>
              ) : null}

              <View style={{ gap: 4 }}>
                {g.items.map((c) => {
                  const isCurrent = c.id === currentId;
                  const tier = chapterTier({ order: c.order, isAuthed, purchased });
                  const locked = tier !== 'open';
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => (locked ? onLockedTap?.(tier) : onNavigate(c.id))}
                      className="flex-row items-center rounded-xl px-3 py-2.5 active:opacity-60"
                      style={{
                        backgroundColor: isCurrent ? withAlpha(accent, 0.14) : 'transparent',
                        opacity: locked ? 0.55 : 1,
                        gap: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: serif,
                            fontSize: 17,
                            fontWeight: isCurrent ? '600' : '500',
                            color: isCurrent ? accent : tokens.ink,
                          }}
                        >
                          {c.title}
                        </Text>
                        {c.subtitle ? (
                          <Text
                            style={{
                              fontFamily: serifItalic,
                              fontSize: 13,
                              marginTop: 2,
                              color: isCurrent ? withAlpha(accent, 0.85) : tokens.inkSecondary,
                            }}
                          >
                            {c.subtitle}
                          </Text>
                        ) : null}
                      </View>
                      {locked ? (
                        <Ionicons
                          name="lock-closed"
                          size={14}
                          color={tokens.inkTertiary}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        </ScrollShadow>
      ) : (
        <GlossaryList />
      )}
    </View>
  );
}

function PillSwitcher({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { tokens } = useSettings();
  const offset = useSharedValue(tab === 'contents' ? 0 : 1);

  const setTab = (next: Tab) => {
    offset.value = withTiming(next === 'contents' ? 0 : 1, {
      duration: 240,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    onChange(next);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${offset.value * 50}%`,
  }));

  return (
    <View
      className="relative flex-row rounded-full"
      style={{ backgroundColor: tokens.bgSoft, padding: 3, height: 36 }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 3,
            bottom: 3,
            width: '50%',
            backgroundColor: tokens.bg,
            borderRadius: 999,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          },
          indicatorStyle,
        ]}
      />
      <PillLabel label="Contents" active={tab === 'contents'} onPress={() => setTab('contents')} />
      <PillLabel label="Glossary" active={tab === 'glossary'} onPress={() => setTab('glossary')} />
    </View>
  );
}

function PillLabel({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { tokens } = useSettings();
  return (
    <Pressable onPress={onPress} className="flex-1 items-center justify-center z-10">
      <Text
        style={{
          fontFamily: serif,
          fontSize: 14,
          fontWeight: active ? '600' : '500',
          color: active ? tokens.ink : tokens.inkTertiary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
