import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import islandsInfo from '@/content/islands-info.json';

const WORD_DARK = require('@/assets/images/islands-word.png');
const WORD_LIGHT = require('@/assets/images/islands-word_white.png');

type WordmarkProps = {
  /** Height of the wordmark in points. Width is derived ~3.4×. */
  height?: number;
};

/**
 * Theme-aware Islands wordmark, vertically nudged so its visible glyph aligns
 * with surrounding text. Single source of truth for the logo across the app.
 */
export function IslandsWordmark({ height = 14 }: WordmarkProps) {
  const { theme } = useSettings();
  const isDark = theme === 'dark' || theme === 'oled';
  const source = isDark ? WORD_LIGHT : WORD_DARK;

  return (
    <Image
      source={source}
      style={{
        height,
        width: height * 3.4,
        // The wordmark PNG has whitespace below the visible glyph; lift it
        // so its optical center sits on the surrounding text's baseline.
        transform: [{ translateY: -Math.round(height * 0.18) }],
      }}
      resizeMode="contain"
    />
  );
}

/**
 * Auth-attribution row: "powered by [Islands] ⌃" — tap to expand a brief
 * explanation of single-sign-on across Ethan's apps. Expansion is inline
 * (no modal) so it doesn't interrupt the flow.
 */
export function PoweredByIslands() {
  const { tokens, accent } = useSettings();
  const [open, setOpen] = useState(false);

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(22).stiffness(220).mass(0.5)}
      style={{ alignItems: 'center', paddingTop: 6 }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? 'Hide Islands info' : 'Learn about Islands'}
        hitSlop={8}
        className="flex-row items-center active:opacity-70"
        style={{ gap: 6, paddingVertical: 4 }}
      >
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 12,
            color: tokens.inkTertiary,
          }}
        >
          {islandsInfo.label}
        </Text>
        <IslandsWordmark height={14} />
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={tokens.inkTertiary}
        />
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}
          exiting={FadeOut.duration(140)}
          style={{
            marginTop: 10,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: withAlpha(accent, 0.35),
            backgroundColor: withAlpha(accent, 0.05),
            gap: 10,
            maxWidth: 380,
          }}
        >
          <Text
            style={{
              fontFamily: serif,
              fontSize: 13,
              lineHeight: 19,
              color: tokens.ink,
            }}
          >
            {islandsInfo.intro}{' '}
            {islandsInfo.apps.map((name, i) => (
              <Text key={name}>
                <Text style={{ fontWeight: '600' }}>{name}</Text>
                {i < islandsInfo.apps.length - 1 ? ', ' : ' '}
              </Text>
            ))}
            {islandsInfo.outro}
          </Text>
          <Text
            style={{
              fontFamily: serif,
              fontSize: 13,
              lineHeight: 19,
              color: tokens.ink,
            }}
          >
            {islandsInfo.signInHint}
          </Text>
          <Text
            style={{
              fontFamily: serifItalic,
              fontSize: 11,
              color: tokens.inkTertiary,
            }}
          >
            {islandsInfo.footer}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
