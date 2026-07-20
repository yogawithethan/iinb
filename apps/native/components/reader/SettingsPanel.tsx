import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

// Panel sits at top:100 from the screen top.
// Tabs ~70 + 16 (top padding) + ~12 spacing → reserve ~104 for chrome inside the panel.
const PANEL_TOP = 100;
const SETTINGS_TABS_RESERVE = 104;

import { serif } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import { AudioSettings } from './AudioSettings';
import { DisplaySettings } from './DisplaySettings';
import { ReadingSettings } from './ReadingSettings';
import { ProfileSettings } from './ProfileSettings';

type Tab = 'display' | 'reading' | 'audio' | 'profile';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TABS: { id: Tab; label: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { id: 'display', label: 'Display', icon: 'sunny-outline', iconActive: 'sunny' },
  { id: 'reading', label: 'Reading', icon: 'book-outline', iconActive: 'book' },
  { id: 'audio', label: 'Audio', icon: 'musical-note-outline', iconActive: 'musical-note' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', iconActive: 'person' },
];

export function SettingsPanel({
  onStartRsvp,
  initialTab = 'display',
  authOpenTrigger = 0,
  redeemOpenTrigger = 0,
}: {
  onStartRsvp: () => void;
  initialTab?: Tab;
  authOpenTrigger?: number;
  redeemOpenTrigger?: number;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  // The panel itself is always mounted (only animated in/out), so we sync
  // the tab whenever the caller asks for a different initialTab.
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const { tokens } = useSettings();
  const { height: windowHeight } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const settingsMax =
    windowHeight - PANEL_TOP - tabBarHeight - 16 - SETTINGS_TABS_RESERVE;

  return (
    <View>
      <View className="px-4 pt-4">
        <SettingsTabs tab={tab} onChange={setTab} />
      </View>

      <Animated.View
        layout={LinearTransition.springify().damping(14).stiffness(220).mass(0.5)}
        style={{ position: 'relative' }}
      >
        <ScrollView
          style={{ maxHeight: settingsMax }}
          contentContainerClassName="pb-6"
        >
          {tab === 'display' ? (
            <DisplaySettings />
          ) : tab === 'reading' ? (
            <ReadingSettings onStartRsvp={onStartRsvp} />
          ) : tab === 'audio' ? (
            <AudioSettings />
          ) : (
            <ProfileSettings
              authOpenTrigger={authOpenTrigger}
              redeemOpenTrigger={redeemOpenTrigger}
            />
          )}
        </ScrollView>
        {/* Top-only fade so the tab pill seems to dive cleanly behind the
            scrolling content. The previous ScrollShadow component faded both
            edges; the bottom fade was distracting once content was short. */}
        <LinearGradient
          pointerEvents="none"
          colors={[tokens.bg, withAlpha(tokens.bg, 0)]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 24,
          }}
        />
      </Animated.View>
    </View>
  );
}

function SettingsTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { tokens } = useSettings();
  const offset = useSharedValue(TABS.findIndex((t) => t.id === tab));

  // Sync the indicator when the active tab changes from outside (e.g. the
  // reader opens Settings on the Profile tab via `initialTab`).
  useEffect(() => {
    const idx = TABS.findIndex((t) => t.id === tab);
    offset.value = withTiming(idx, {
      duration: 240,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [tab, offset]);

  const handle = (next: Tab) => {
    onChange(next);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${(offset.value * 100) / TABS.length}%`,
  }));

  return (
    <View
      className="rounded-2xl"
      style={{ backgroundColor: tokens.bgSoft, padding: 4, height: 70 }}
    >
      <View className="relative flex-1 flex-row">
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: `${100 / TABS.length}%`,
              backgroundColor: tokens.bg,
              borderRadius: 14,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            },
            indicatorStyle,
          ]}
        />
        {TABS.map((t) => {
        const active = t.id === tab;
        const color = active ? tokens.ink : tokens.inkTertiary;
        return (
          <Pressable
            key={t.id}
            onPress={() => handle(t.id)}
            className="flex-1 items-center justify-center z-10"
            style={{ gap: 4 }}
          >
            <Ionicons name={active ? t.iconActive : t.icon} size={20} color={color} />
            <Text
              style={{
                fontFamily: serif,
                fontSize: 11,
                fontWeight: active ? '600' : '400',
                color,
              }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
        })}
      </View>
    </View>
  );
}
