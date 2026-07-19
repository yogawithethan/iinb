import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import type { Block } from '@/lib/blocks';
import { buildWordStream, orpIndex, tickMs } from '@/lib/rsvp';
import { withAlpha } from '@/lib/theme';

type Props = {
  blocks: Block[];
  chapterTitle: string;
  /** Word-stream index to resume at (saved progress). */
  startIdx?: number;
  /** Block index to begin at — converted to a word index internally. Wins
   *  over `startIdx` when both are supplied. */
  startBlockIdx?: number;
  onExit: (info: { idx: number; blockIdx: number }) => void;
};

export function RsvpOverlay({
  blocks,
  chapterTitle,
  startIdx = 0,
  startBlockIdx,
  onExit,
}: Props) {
  const { rsvpWpm, accent, tokens, update } = useSettings();
  const words = useMemo(() => buildWordStream(blocks), [blocks]);
  const initialIdx = useMemo(() => {
    if (typeof startBlockIdx === 'number') {
      const i = words.findIndex((w) => w.blockIdx === startBlockIdx);
      if (i >= 0) return i;
    }
    return Math.min(Math.max(0, startIdx), Math.max(0, words.length - 1));
    // We intentionally only seed `idx` once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [idx, setIdx] = useState(initialIdx);
  const [playing, setPlaying] = useState(true);

  // Pre-stream phase: a guided inhale-4 / exhale-4 breath. The word tick stays
  // paused until phase becomes 'streaming'.
  const [phase, setPhase] = useState<'breath' | 'streaming'>('breath');
  const [breathLabel, setBreathLabel] = useState<'Breathe in' | 'Breathe out'>('Breathe in');
  const breathScale = useSharedValue(0.55);

  useEffect(() => {
    if (phase !== 'breath') return;
    breathScale.value = withTiming(1, {
      duration: 4000,
      easing: Easing.inOut(Easing.cubic),
    });
    const exhale = setTimeout(() => {
      setBreathLabel('Breathe out');
      breathScale.value = withTiming(0.55, {
        duration: 4000,
        easing: Easing.inOut(Easing.cubic),
      });
    }, 4000);
    const start = setTimeout(() => setPhase('streaming'), 8000);
    return () => {
      clearTimeout(exhale);
      clearTimeout(start);
    };
  }, [phase, breathScale]);

  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const skipBreath = () => setPhase('streaming');

  const exit = () => {
    const blockIdx = words[idx]?.blockIdx ?? 0;
    onExit({ idx, blockIdx });
  };
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drive the tick.
  useEffect(() => {
    if (!playing || phase !== 'streaming') return;
    if (idx >= words.length - 1) {
      setPlaying(false);
      return;
    }
    const w = words[idx];
    const ms = tickMs(w.word, rsvpWpm, {
      endOfSentence: w.endOfSentence,
      endOfBlock: w.endOfBlock,
      endOfClause: w.endOfClause,
    });
    timerRef.current = setTimeout(() => {
      setIdx((i) => Math.min(words.length - 1, i + 1));
    }, ms);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, playing, rsvpWpm, words, phase]);

  const current = words[idx]?.word ?? '';
  const next = words[idx + 1]?.word ?? '';
  const prev = words[idx - 1]?.word ?? '';
  const orp = orpIndex(current);
  const progress = words.length ? ((idx + 1) / words.length) * 100 : 0;

  const skip = (delta: number) =>
    setIdx((i) => Math.max(0, Math.min(words.length - 1, i + delta)));

  const adjustSpeed = (delta: number) => {
    const next = Math.max(200, Math.min(800, rsvpWpm + delta));
    update({ rsvpWpm: next });
  };

  return (
    <View
      className="absolute inset-0 flex-1"
      style={{ backgroundColor: tokens.bg, zIndex: 100 }}
    >
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5 pt-14 pb-2">
        <Text
          style={{
            fontFamily: serif,
            fontSize: 11,
            letterSpacing: 1.6,
            color: tokens.inkTertiary,
            textTransform: 'uppercase',
          }}
        >
          RSVP · {rsvpWpm} wpm
        </Text>
        <Pressable
          onPress={exit}
          accessibilityLabel="Exit RSVP"
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ borderWidth: 1, borderColor: tokens.pillBorder, backgroundColor: tokens.bg }}
        >
          <Ionicons name="close" size={18} color={tokens.ink} />
        </Pressable>
      </View>

      {/* Chapter caption */}
      <Text
        style={{
          fontFamily: serifItalic,
          fontSize: 13,
          color: tokens.inkTertiary,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        {chapterTitle}
      </Text>

      {/* Pre-stream: guided inhale/exhale breath. */}
      {phase === 'breath' ? (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ gap: 32 }}
        >
          {/* Static "bezel" ring containing the breathing circle. */}
          <View
            style={{
              width: 240,
              height: 240,
              borderRadius: 999,
              borderWidth: 1.5,
              borderColor: withAlpha(accent, 0.3),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              style={[
                {
                  width: 200,
                  height: 200,
                  borderRadius: 999,
                  backgroundColor: withAlpha(accent, 0.18),
                  borderWidth: 1,
                  borderColor: withAlpha(accent, 0.45),
                },
                breathStyle,
              ]}
            />
          </View>

          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                fontFamily: serifItalic,
                fontSize: 22,
                color: tokens.ink,
              }}
            >
              {breathLabel}
            </Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 11,
                letterSpacing: 1.6,
                color: tokens.inkTertiary,
                textTransform: 'uppercase',
              }}
            >
              Settle in · 4s in · 4s out
            </Text>
          </View>

          <Pressable onPress={skipBreath} hitSlop={8}>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                textDecorationLine: 'underline',
              }}
            >
              Skip
            </Text>
          </Pressable>
        </View>
      ) : (
      <Pressable
        onPress={() => setPlaying((p) => !p)}
        className="flex-1 items-center justify-center px-6"
        accessibilityLabel={playing ? 'Pause' : 'Resume'}
      >
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 14,
            color: tokens.inkTertiary,
            minHeight: 20,
            marginBottom: 12,
          }}
        >
          {prev}
        </Text>

        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          minimumFontScale={0.4}
          style={{
            fontFamily: serif,
            fontSize: 56,
            lineHeight: 64,
            color: tokens.ink,
            letterSpacing: 1,
            textAlign: 'center',
            alignSelf: 'stretch',
            paddingHorizontal: 8,
          }}
        >
          <Text>{current.slice(0, orp)}</Text>
          <Text style={{ color: accent }}>{current.charAt(orp)}</Text>
          <Text>{current.slice(orp + 1)}</Text>
        </Text>

        <View
          style={{
            marginTop: 24,
            height: 2,
            width: 48,
            backgroundColor: withAlpha(tokens.inkTertiary.startsWith('#') ? tokens.inkTertiary : '#888888', 0.4),
          }}
        />

        <Text
          style={{
            fontFamily: serif,
            fontSize: 14,
            color: tokens.inkTertiary,
            minHeight: 20,
            marginTop: 12,
          }}
        >
          {next}
        </Text>

        {!playing ? (
          <Text
            style={{
              fontFamily: serif,
              fontSize: 11,
              letterSpacing: 1.6,
              color: tokens.inkTertiary,
              textTransform: 'uppercase',
              marginTop: 32,
            }}
          >
            Paused · tap to resume
          </Text>
        ) : null}
      </Pressable>
      )}

      {/* Controls row — hidden during the breath intro. */}
      <View className="px-5 pb-6">
        <View className="flex-row items-start justify-between mb-4">
          <ControlButton
            icon="remove"
            label="−25 wpm"
            accessibilityLabel="Decrease speed by 25 wpm"
            onPress={() => adjustSpeed(-25)}
            disabled={rsvpWpm <= 200}
          />
          <ControlButton
            icon="play-back"
            label="Back 10"
            accessibilityLabel="Skip back 10 words"
            onPress={() => skip(-10)}
          />
          <ControlButton
            icon={playing ? 'pause' : 'play'}
            label={playing ? 'Pause' : 'Play'}
            accessibilityLabel={playing ? 'Pause' : 'Resume'}
            onPress={() => setPlaying((p) => !p)}
            primary
          />
          <ControlButton
            icon="play-forward"
            label="Forward 10"
            accessibilityLabel="Skip forward 10 words"
            onPress={() => skip(10)}
          />
          <ControlButton
            icon="add"
            label="+25 wpm"
            accessibilityLabel="Increase speed by 25 wpm"
            onPress={() => adjustSpeed(25)}
            disabled={rsvpWpm >= 800}
          />
        </View>

        {/* Progress bar */}
        <View
          className="h-[3px] w-full overflow-hidden rounded-full"
          style={{ backgroundColor: withAlpha(accent, 0.18) }}
        >
          <View
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: accent,
            }}
          />
        </View>
      </View>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
  primary,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  const { tokens, accent } = useSettings();
  const size = primary ? 56 : 44;
  const iconSize = primary ? 24 : 18;
  const bg = primary ? accent : tokens.bg;
  const iconColor = primary ? '#ffffff' : tokens.ink;
  return (
    <View className="items-center" style={{ width: 64, opacity: disabled ? 0.4 : 1 }}>
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        disabled={disabled}
        className="items-center justify-center rounded-full active:opacity-70"
        style={{
          height: size,
          width: size,
          backgroundColor: bg,
          borderWidth: primary ? 0 : 1,
          borderColor: tokens.pillBorder,
        }}
      >
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </Pressable>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 10,
          letterSpacing: 0.6,
          color: tokens.inkTertiary,
          marginTop: 6,
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}
