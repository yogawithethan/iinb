import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { TextStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { Block } from '@/lib/blocks';
import { AUDIO_CLIPS } from '@/lib/audio-map';
import { CONTENT_IMAGES } from '@/lib/image-map';
import { splitBionic } from '@/lib/bionic';
import { expandGlossary, parseInline } from '@/lib/inline';
import { withAlpha } from '@/lib/theme';
import { FootnoteStream } from './Footnote';

type Expansion = { kind: 'footnote'; runId: number } | null;

type Props = {
  block: Block;
  chapterId: string;
  blockIdx: number;
  fontSize: number;
  fontFamily: string;
  italicFamily: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  accent: string;
  bionic: boolean;
  onRefresh?: () => void;
  /** When provided, glossary taps surface to the parent (reader) which
   *  renders a centered popup. Without it, glossary taps are inert. */
  onGlossaryTap?: (term: string) => void;
  /** When set, the paragraph text is replaced by an AI-rewritten version
   *  in the reader's voice. The refresh icon turns into a revert icon. */
  rewrittenText?: string;
  /** Called when the user taps the revert icon (only relevant if rewrittenText is set). */
  onRevert?: () => void;
  /** Show a subtle pulsing dot in place of the refresh icon. */
  refreshLoading?: boolean;
  /** Per-span rewrites for `{{...}}` swap markers in this block, keyed by
   *  the swap-run index within the parsed inline runs. */
  spanRewrites?: Record<number, string>;
  /** Index of the swap run currently being refreshed (skeleton state), or null. */
  spanLoadingIdx?: number | null;
  /** Triggered when the user taps the refresh icon next to a `{{...}}` span.
   *  `paragraph` is the plain-text paragraph (with the original span inline) the
   *  model uses for context. */
  onRefreshSpan?: (spanIdx: number, original: string, paragraph: string) => void;
  /** Revert a previously-swapped span back to the original. */
  onRevertSpan?: (spanIdx: number) => void;
};

function tokenizeRun(text: string): { word: string; isWord: boolean }[] {
  const out: { word: string; isWord: boolean }[] = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const word = m[0];
    out.push({ word, isWord: /\S/.test(word) });
  }
  return out;
}

export function BlockRenderer({
  block,
  chapterId: _chapterId,
  blockIdx: _blockIdx,
  fontSize,
  fontFamily,
  italicFamily,
  ink,
  inkSecondary,
  inkTertiary,
  accent,
  bionic,
  onRefresh,
  rewrittenText,
  onRevert,
  refreshLoading,
  onGlossaryTap,
  spanRewrites,
  spanLoadingIdx,
  onRefreshSpan,
  onRevertSpan,
}: Props) {
  const [expansion, setExpansion] = useState<Expansion>(null);

  const isBlockquote = block.kind === 'p' && block.text.startsWith('> ');
  const sourceText = rewrittenText ?? block.text;
  const text = isBlockquote ? sourceText.replace(/^>\s?/gm, '') : sourceText;

  const runs = useMemo(() => expandGlossary(parseInline(text)), [text]);
  // Plain-text reconstruction of the paragraph with `{{...}}` braces stripped
  // (the inner span text remains in place). Sent to the model as context so it
  // can match tone, register, and grammatical fit when rewriting a span.
  const plainParagraph = useMemo(
    () =>
      text
        .replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, inner: string) => inner.trim())
        .replace(/\s+/g, ' ')
        .trim(),
    [text],
  );

  if (block.kind === 'image' && block.image) {
    return (
      <ContentImage
        filename={block.image}
        caption={block.text}
        fontSize={fontSize}
        italicFamily={italicFamily}
        inkSecondary={inkSecondary}
      />
    );
  }
  const isBionic = bionic && block.kind === 'p';

  const headingMargin = (extra: number) => ({
    marginTop: 18 + extra * 2,
    marginBottom: 6 + extra,
  });

  const baseStyle: TextStyle = (() => {
    switch (block.kind) {
      case 'h1':
        return {
          fontSize: fontSize + 8,
          lineHeight: (fontSize + 8) * 1.25,
          color: ink,
          fontFamily,
          fontWeight: '700',
          ...headingMargin(4),
        };
      case 'h2':
        return {
          fontSize: fontSize + 4,
          lineHeight: (fontSize + 4) * 1.3,
          color: ink,
          fontFamily,
          fontWeight: '700',
          ...headingMargin(2),
        };
      case 'h3':
        return {
          fontSize: fontSize + 2,
          lineHeight: (fontSize + 2) * 1.35,
          color: ink,
          fontFamily,
          fontWeight: '700',
          ...headingMargin(1),
        };
      default:
        return {
          fontSize,
          lineHeight: fontSize * 1.65,
          color: ink,
          fontFamily,
          marginBottom: Math.round(fontSize * 0.7),
        };
    }
  })();

  const closeExpansion = () => setExpansion(null);

  const renderBionicRun = (
    runText: string,
    runStyle: TextStyle | undefined,
    keyPrefix: string,
  ): React.ReactNode => {
    const tokens = tokenizeRun(runText);
    return tokens.map((t, i) =>
      t.isWord ? (
        <Text key={`${keyPrefix}-${i}`} style={runStyle}>
          {bionicWord(t.word)}
        </Text>
      ) : (
        <Text key={`${keyPrefix}-${i}`} style={runStyle}>
          {t.word}
        </Text>
      ),
    );
  };

  const inline = (
    <Text style={baseStyle}>
      {runs.map((run, i) => {
        if (run.kind === 'footnote') {
          const isOpen = expansion?.kind === 'footnote' && expansion.runId === i;
          return (
            <Text key={i}>
              {!isOpen ? (
                <Text
                  onPress={() => setExpansion({ kind: 'footnote', runId: i })}
                  style={{ color: accent }}
                >
                  {' '}
                  <Ionicons
                    name="document-text-outline"
                    size={fontSize * 0.8}
                    color={accent}
                  />
                  {' '}
                </Text>
              ) : null}
              {isOpen ? (
                <FootnoteStream
                  text={run.text}
                  color={inkSecondary}
                  accent={accent}
                  italic
                  fontFamily={fontFamily}
                  italicFamily={italicFamily}
                  iconSize={fontSize * 0.8}
                  onClose={closeExpansion}
                />
              ) : null}
            </Text>
          );
        }

        if (run.kind === 'swap') {
          const rewritten = spanRewrites?.[i];
          const isLoading = spanLoadingIdx === i;
          const displayText = rewritten ?? run.text;
          if (isLoading) {
            // Replace the span with a tiny accent-tinted skeleton inline.
            return (
              <Text key={i}>
                <SwapSkeleton accent={accent} fontSize={fontSize} />
              </Text>
            );
          }
          return (
            <Text key={i}>
              <Text style={{ color: ink }}>{displayText}</Text>
              {onRefreshSpan ? (
                <Text>
                  {' '}
                  <Text
                    onPress={() => {
                      if (rewritten && onRevertSpan) {
                        onRevertSpan(i);
                      } else {
                        onRefreshSpan(i, run.text, plainParagraph);
                      }
                    }}
                    style={{ color: accent }}
                  >
                    <Ionicons
                      name={rewritten ? 'arrow-undo-outline' : 'refresh-outline'}
                      size={fontSize * 0.78}
                      color={accent}
                    />
                  </Text>
                </Text>
              ) : null}
            </Text>
          );
        }

        if (run.kind === 'glossary') {
          return (
            <Text
              key={i}
              onPress={() => onGlossaryTap?.(run.text)}
              style={{
                color: ink,
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: withAlpha(accent, 0.7),
              }}
            >
              {run.text}
            </Text>
          );
        }

        const runStyle: TextStyle = {};
        if (run.kind === 'em' || run.kind === 'strongEm') {
          runStyle.fontFamily = italicFamily;
          runStyle.fontStyle = 'italic';
        }
        if (run.kind === 'strong' || run.kind === 'strongEm') {
          runStyle.fontWeight = '700';
        }

        if (isBionic) {
          return <Text key={i}>{renderBionicRun(run.text, runStyle, `r${i}`)}</Text>;
        }
        return (
          <Text key={i} style={runStyle}>
            {run.text}
          </Text>
        );
      })}

      {block.refreshable && onRefresh ? (
        <Text>
          {'  '}
          {rewrittenText ? (
            <Text onPress={onRevert} style={{ color: accent }}>
              <Ionicons name="arrow-undo-outline" size={fontSize * 0.78} color={accent} />
            </Text>
          ) : (
            <Text onPress={onRefresh} style={{ color: accent }}>
              <Ionicons name="refresh-outline" size={fontSize * 0.78} color={accent} />
            </Text>
          )}
        </Text>
      ) : null}
    </Text>
  );

  const containerStyle = isBlockquote
    ? {
        borderLeftWidth: 2,
        borderLeftColor: withAlpha(inkTertiary, 0.6),
        paddingLeft: 14,
        marginVertical: fontSize,
      }
    : undefined;

  const body = isBlockquote ? (
    <Text style={[baseStyle, { fontFamily: italicFamily, color: inkSecondary }]}>
      {inline.props.children}
    </Text>
  ) : (
    inline
  );

  const audioFooter =
    block.audio && AUDIO_CLIPS[block.audio.toLowerCase()] != null ? (
      <AudioPlayButton
        clipId={block.audio.toLowerCase()}
        accent={accent}
        inkSecondary={inkSecondary}
        fontSize={fontSize}
      />
    ) : null;

  // While a refresh is in flight, replace the paragraph with a shimmering
  // skeleton in the secondary accent. When the rewrite arrives the new text
  // fades in over the freshly cleared space.
  if (refreshLoading) {
    return (
      <View style={containerStyle}>
        <RefreshSkeleton accent={accent} fontSize={fontSize} baseStyle={baseStyle} />
        {audioFooter}
      </View>
    );
  }

  // When a fresh rewrite has just landed, fade the new text in. Keying off
  // `rewrittenText` causes the inner Animated.View to remount and re-fire
  // its enter animation each time the rewrite changes.
  if (rewrittenText) {
    return (
      <View style={containerStyle}>
        <Animated.View
          key={rewrittenText.slice(0, 24)}
          entering={FadeIn.duration(420).easing(Easing.out(Easing.cubic))}
        >
          {body}
        </Animated.View>
        {audioFooter}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {body}
      {audioFooter}
    </View>
  );
}

/**
 * Loading state for an AI-rewritten paragraph. Renders three text-height bars
 * tinted in the secondary accent that pulse together — gives a clear "this
 * paragraph is being rewritten right now" signal without a discordant spinner.
 */
function RefreshSkeleton({
  accent,
  fontSize,
  baseStyle,
}: {
  accent: string;
  fontSize: number;
  baseStyle: TextStyle;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(pulse);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    // 0.45 → 0.95 oscillation. The accent colour itself is what's pulsing,
    // not the whole row, so the effect reads as "shine" rather than blink.
    opacity: 0.45 + pulse.value * 0.5,
  }));

  const lineHeight = (typeof baseStyle.lineHeight === 'number' ? baseStyle.lineHeight : fontSize * 1.65);
  const barHeight = lineHeight * 0.55;
  const barRadius = barHeight / 2;
  const marginBottom = (typeof baseStyle.marginBottom === 'number' ? baseStyle.marginBottom : Math.round(fontSize * 0.7));

  // Slight width variation so it reads as a paragraph, not a card.
  const widths: Array<number | `${number}%`> = ['100%', '97%', '72%'];

  return (
    <View
      style={{
        // Match the original paragraph footprint so surrounding spacing
        // doesn't jump when the skeleton renders.
        marginBottom,
        paddingTop: lineHeight - barHeight, // align baseline with text-y
        gap: lineHeight - barHeight,
      }}
    >
      {widths.map((w, i) => (
        <Animated.View
          key={i}
          style={[
            {
              height: barHeight,
              width: w,
              borderRadius: barRadius,
              backgroundColor: withAlpha(accent, 0.22),
            },
            animatedStyle,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Block-level image rendered from a `![caption](filename.png)` markdown line.
 * Sized to the available column width (contain) so portrait and landscape
 * source images both look right. Caption is optional.
 */
function ContentImage({
  filename,
  caption,
  fontSize,
  italicFamily,
  inkSecondary,
}: {
  filename: string;
  caption: string;
  fontSize: number;
  italicFamily: string;
  inkSecondary: string;
}) {
  const source = CONTENT_IMAGES[filename];
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!source) return;
    const resolved = Image.resolveAssetSource(source);
    if (resolved?.width && resolved?.height) {
      setSize({ w: resolved.width, h: resolved.height });
    }
  }, [source]);

  if (!source) {
    return (
      <View style={{ marginVertical: fontSize, paddingVertical: 8 }}>
        <Text style={{ fontFamily: italicFamily, color: inkSecondary, fontSize: fontSize * 0.85 }}>
          Missing image: {filename}
        </Text>
      </View>
    );
  }

  const aspect = size ? size.w / size.h : 16 / 9;
  const renderedHeight = containerWidth ? containerWidth / aspect : undefined;

  return (
    <View
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{ marginVertical: fontSize * 1.1, alignItems: 'center' }}
    >
      <Image
        source={source}
        style={{
          width: '100%',
          height: renderedHeight,
          borderRadius: 4,
        }}
        resizeMode="contain"
      />
      {caption ? (
        <Text
          style={{
            fontFamily: italicFamily,
            fontSize: fontSize * 0.82,
            color: inkSecondary,
            marginTop: 8,
            textAlign: 'center',
            lineHeight: fontSize * 0.82 * 1.4,
          }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Inline shimmer that replaces a `{{...}}` swap span while its rewrite is
 * loading. Renders as three pulsing dots tinted in the accent — keeps the
 * paragraph's reading rhythm intact (no big block-shaped gap).
 */
function SwapSkeleton({ accent, fontSize }: { accent: string; fontSize: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, []);
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.55,
  }));
  const dot = (
    <Animated.View
      style={[
        {
          width: fontSize * 0.45,
          height: fontSize * 0.45,
          borderRadius: fontSize * 0.225,
          backgroundColor: accent,
          marginHorizontal: 2,
        },
        dotStyle,
      ]}
    />
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
      }}
    >
      {dot}
      {dot}
      {dot}
    </View>
  );
}

/**
 * Small inline play button shown beneath a paragraph that carries a
 * `{{audio:NAME}}` marker. Toggles between play and pause; the clip stops
 * automatically when it ends.
 */
function AudioPlayButton({
  clipId,
  accent,
  inkSecondary,
  fontSize,
}: {
  clipId: string;
  accent: string;
  inkSecondary: string;
  fontSize: number;
}) {
  const player = useAudioPlayer(AUDIO_CLIPS[clipId]);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // iOS silences app audio by default when the ringer switch is off. The book
  // is a quiet reading experience — the user has explicitly tapped Play, so
  // honor that even in silent mode.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true } as any).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      setPlaying(!!status.playing);
      if (typeof status.duration === 'number' && status.duration > 0) {
        setDuration(status.duration);
      }
      if (typeof status.currentTime === 'number') {
        setCurrentTime(status.currentTime);
      }
      if (status.didJustFinish) {
        player.seekTo(0);
        setCurrentTime(0);
      }
    });
    return () => {
      sub.remove();
      try {
        player.pause();
      } catch {}
    };
  }, [player]);

  const onPress = () => {
    if (player.playing) {
      player.pause();
    } else {
      if (duration > 0 && currentTime >= duration - 0.05) {
        player.seekTo(0);
        setCurrentTime(0);
      }
      player.play();
    }
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={playing ? 'Pause clip' : 'Play clip'}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: Math.round(fontSize * 0.6),
        marginBottom: Math.round(fontSize * 1.1),
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: withAlpha(accent, 0.35),
        backgroundColor: withAlpha(accent, 0.08),
      }}
    >
      <Ionicons
        name={playing ? 'pause' : 'play'}
        size={fontSize * 0.95}
        color={accent}
      />
      <View style={{ flex: 1 }}>
        <Waveform
          progress={progress}
          playing={playing}
          accent={accent}
          inkTertiary={withAlpha(accent, 0.28)}
          fontSize={fontSize}
        />
      </View>
      <Text
        style={{
          color: inkSecondary,
          fontSize: fontSize * 0.72,
          fontVariant: ['tabular-nums'],
          minWidth: fontSize * 4.5,
          textAlign: 'right',
        }}
      >
        {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '–:––'}
      </Text>
    </Pressable>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Stylized audio waveform — fixed bars with deterministic pseudo-random
 * heights so the same clip always renders the same shape. Played-through
 * bars are tinted in the full accent; remaining bars use the dim accent.
 * The "playing" cursor bar pulses subtly.
 */
function Waveform({
  progress,
  playing,
  accent,
  inkTertiary,
  fontSize,
}: {
  progress: number;
  playing: boolean;
  accent: string;
  inkTertiary: string;
  fontSize: number;
}) {
  const BAR_COUNT = 28;
  // Deterministic heights from a fixed seed so the shape is stable per render.
  const heights = useMemo(() => {
    const out: number[] = [];
    let seed = 0x2f6e2b1; // arbitrary
    for (let i = 0; i < BAR_COUNT; i++) {
      // xorshift32
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const r = ((seed >>> 0) % 1000) / 1000;
      // Bell-ish: taller in the middle, shorter at edges.
      const distFromCenter = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2);
      const envelope = 1 - distFromCenter * 0.45;
      out.push(0.35 + r * 0.65 * envelope);
    }
    return out;
  }, []);

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (playing) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => cancelAnimation(pulse);
  }, [playing]);

  const cursorIdx = Math.floor(progress * BAR_COUNT);
  const cursorStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
  }));

  const maxBarHeight = fontSize * 1.3;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: maxBarHeight,
      }}
    >
      {heights.map((h, i) => {
        const isPlayed = i < cursorIdx;
        const isCursor = i === cursorIdx && playing;
        const barHeight = Math.max(3, h * maxBarHeight);
        // Bars share the full available width via flex; each bar is a thin
        // pill horizontally centered in its slice. marginHorizontal gives a
        // hairline gap that scales with available width.
        const baseStyle = {
          flex: 1,
          marginHorizontal: 1,
          height: barHeight,
          borderRadius: 1.5,
          backgroundColor: isPlayed || isCursor ? accent : inkTertiary,
          maxWidth: 4,
          alignSelf: 'center' as const,
        };
        if (isCursor) {
          return <Animated.View key={i} style={[baseStyle, cursorStyle]} />;
        }
        return <View key={i} style={baseStyle} />;
      })}
    </View>
  );
}

function bionicWord(word: string): React.ReactNode {
  if (!/^\p{L}/u.test(word)) return word;
  const [head, tail] = splitBionic(word);
  return (
    <>
      <Text style={{ fontWeight: '700' }}>{head}</Text>
      {tail}
    </>
  );
}
