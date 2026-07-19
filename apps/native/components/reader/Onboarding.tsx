import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import ColorPicker, { HueSlider, Panel1 } from 'reanimated-color-picker';
import { Slider } from 'heroui-native';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings, type Decade, type RefreshProfile } from '@/lib/SettingsContext';
import { THEME_CARDS, withAlpha, type ThemeId } from '@/lib/theme';
import { splitBionic, tokenizeWords } from '@/lib/bionic';
import { orpIndex, tickMs } from '@/lib/rsvp';
import chaptersJson from '@/content/chapters.json';

type ChapterMeta = {
  id: string;
  order: number;
  title: string;
  subtitle?: string;
  isFree?: boolean;
};
const CHAPTER_LIST = chaptersJson as ChapterMeta[];

// One vivid paragraph for the Modes + Refresh interactive demos.
const SAMPLE_PARAGRAPH =
  'Despite all the persuasive chatter from biohackers and AI evangelists, your body and mind will grow old and die. Even if it takes a few hundred years longer than biology intends, it remains one of two things you can be absolutely certain about.';

type Step =
  | 'thanks'
  | 'unlocked'
  | 'preferences'
  | 'profile'
  | 'modes'
  | 'refresh'
  | 'tryit';
const ORDER: Step[] = [
  'thanks',
  'unlocked',
  'preferences',
  'modes',
  'refresh',
  'profile',
  'tryit',
];
const TOTAL = ORDER.length;

const DECADES: Decade[] = ['70s', '80s', '90s', '00s', '10s'];
const HUMOR_OPTIONS = ['Dry / deadpan', 'Absurdist', 'Pop-culture', 'Keep it serious'];
const CULTURE_OPTIONS = [
  'Gaming',
  'Sports',
  'Cooking',
  'Music',
  'Tech',
  'Fitness',
  'Film/TV',
  'Parenting',
];

export function Onboarding() {
  const settings = useSettings();
  const { tokens, accent } = settings;
  const [step, setStep] = useState<Step>('thanks');
  const stepIndex = ORDER.indexOf(step);

  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Animate in on mount.
  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    backdropOpacity.value = withTiming(1, { duration: 240 });
  }, []);

  const finish = () => {
    settings.update({ onboarded: true });
  };

  const goNext = () => {
    if (stepIndex < TOTAL - 1) setStep(ORDER[stepIndex + 1]);
    else finish();
  };
  const goBack = () => {
    if (stepIndex > 0) setStep(ORDER[stepIndex - 1]);
  };

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <View
      className="absolute inset-0"
      style={{ zIndex: 110, backgroundColor: tokens.bg }}
    >
      {/* Subtle theme-tinted backdrop fade-in instead of the old dim overlay,
          since we now occupy the entire screen. */}
      <Animated.View
        style={[
          { position: 'absolute', inset: 0, backgroundColor: tokens.bg },
          backdropStyle,
        ]}
      />

      <Animated.View
        pointerEvents="auto"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: tokens.bg,
          },
          cardStyle,
        ]}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            // Reserve room above the home indicator + a touch of breathing.
            paddingTop: 56,
            paddingBottom: 48,
          }}
        >
          <View style={{ padding: 22, gap: 16, maxWidth: 520, alignSelf: 'center', width: '100%' }}>
              <ProgressDots total={TOTAL} active={stepIndex} accent={accent} muted={tokens.inkTertiary} />

              <Animated.View
                key={step}
                entering={FadeIn.duration(220).easing(Easing.out(Easing.quad))}
                exiting={FadeOut.duration(120)}
              >
                {step === 'thanks' && <ThanksStep onNext={goNext} />}
                {step === 'unlocked' && <UnlockedStep />}
                {step === 'preferences' && <PreferencesStep />}
                {step === 'profile' && <ProfileStep />}
                {step === 'modes' && <ModesStep />}
                {step === 'refresh' && <RefreshStep />}
                {step === 'tryit' && <TryItStep />}
              </Animated.View>

              {step !== 'thanks' ? (
                <FooterNav
                  onBack={goBack}
                  onNext={goNext}
                  nextLabel={step === 'tryit' ? 'Start reading' : 'Next'}
                />
              ) : null}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function ProgressDots({
  total,
  active,
  accent,
  muted,
}: {
  total: number;
  active: number;
  accent: string;
  muted: string;
}) {
  return (
    <View className="flex-row justify-center" style={{ gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === active;
        return (
          <View
            key={i}
            style={{
              height: 6,
              width: isActive ? 22 : 6,
              borderRadius: 999,
              backgroundColor: i <= active ? accent : withAlpha(muted, 0.3),
            }}
          />
        );
      })}
    </View>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  const { tokens } = useSettings();
  return (
    <Text
      style={{
        fontFamily: serif,
        fontSize: 11,
        letterSpacing: 1.2,
        color: tokens.inkTertiary,
        textTransform: 'uppercase',
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const { tokens, accent } = useSettings();
  return (
    <View className="flex-row items-center justify-between" style={{ marginTop: 4 }}>
      <Pressable onPress={onBack} className="px-3 py-2 active:opacity-60">
        <Text style={{ fontFamily: serif, fontSize: 13, color: tokens.inkTertiary }}>Back</Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        className="rounded-full px-5 py-2.5 active:opacity-80"
        style={{ backgroundColor: accent }}
      >
        <Text
          style={{ fontFamily: serif, fontSize: 14, fontWeight: '600', color: '#ffffff' }}
        >
          {nextLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function PillButton({
  selected,
  onPress,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  const { tokens, accent } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-3 py-1.5 active:opacity-70"
      style={{
        borderWidth: 1,
        borderColor: selected ? accent : tokens.pillBorder,
        backgroundColor: selected ? withAlpha(accent, 0.12) : 'transparent',
      }}
    >
      <Text
        style={{
          fontFamily: serif,
          fontSize: 13,
          fontWeight: selected ? '600' : '500',
          color: selected ? accent : tokens.inkSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* -------------- STEP 1: THANK YOU -------------- */

function ThanksStep({ onNext }: { onNext: () => void }) {
  const { tokens, accent } = useSettings();
  const { height } = useWindowDimensions();

  // Butterfly settles in with a slow opacity + tiny scale ease — gentler
  // than the old check-mark pop. Single object on the page, so it carries
  // the whole moment.
  const flyOpacity = useSharedValue(0);
  const flyScale = useSharedValue(0.92);
  useEffect(() => {
    flyOpacity.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });
    flyScale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, []);
  const flyStyle = useAnimatedStyle(() => ({
    opacity: flyOpacity.value,
    transform: [{ scale: flyScale.value }],
  }));

  return (
    <View
      style={{
        // Fill the available vertical space and center contents — the page
        // is now full-screen, so the thank-you should breathe.
        minHeight: height - 220,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
      }}
    >
      <Animated.View style={[{ marginBottom: 28 }, flyStyle]}>
        {/* Butterfly icon shared with the Part III divider — single-tone
            PNG re-tinted to the active theme's ink. */}
        <Image
          source={require('@/assets/images/butterfly.png')}
          style={{ width: 110, height: 110, tintColor: tokens.ink }}
          resizeMode="contain"
        />
      </Animated.View>

      <Text
        style={{
          fontFamily: serif,
          fontSize: 30,
          color: tokens.ink,
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        Thank you.
      </Text>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 15,
          color: tokens.inkSecondary,
          textAlign: 'center',
          // maxWidth pinned narrow enough that the body breaks evenly across
          // 3-4 lines on every common phone width — avoids orphaned tail
          // words like "in" sitting alone on the last line.
          maxWidth: 280,
          lineHeight: 22,
          marginBottom: 36,
        }}
      >
        The whole book is yours now. Take a moment to set it up the way you like.
      </Text>

      <Pressable
        onPress={onNext}
        style={{
          alignSelf: 'stretch',
          maxWidth: 320,
          backgroundColor: accent,
          borderRadius: 999,
          paddingVertical: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: serif, fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
          Continue
        </Text>
      </Pressable>
    </View>
  );
}

/* -------------- STEP 2: UNLOCKED — ANIMATED TOC REVEAL -------------- */

/**
 * Shows the table of contents in its old "locked" state — dimmed rows with
 * lock icons on chapters past the free preface — then animates everything to
 * full opacity as the locks fade out. A small caption resolves at the end.
 */
function UnlockedStep() {
  const { tokens, accent } = useSettings();

  // Now full-screen — show every chapter so the unlock cascade reveals the
  // whole library at once.
  const rows = useMemo(() => CHAPTER_LIST, []);

  // Drives the cascade: 0 = locked (dim rows, visible locks), 1 = unlocked.
  // Per-row stagger derives windows from this single shared value.
  const reveal = useSharedValue(0);

  // Drives a single full-list BlurView whose opacity fades to 0 as `reveal`
  // progresses. Animating BlurView intensity per-row is performance-hostile
  // (each frame re-creates native blur layers) — animating one overlay's
  // opacity gives the same visual effect with one native view, not twelve.
  const blurOpacity = useSharedValue(1);

  useEffect(() => {
    // Short pre-roll so the page settles, then a slow, continuous reveal.
    reveal.value = withDelay(
      350,
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.cubic) }),
    );
    blurOpacity.value = withDelay(
      350,
      withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.cubic) }),
    );
  }, []);

  const blurStyle = useAnimatedStyle(() => ({
    opacity: blurOpacity.value,
  }));

  const captionStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 6 }],
  }));

  return (
    <View style={{ paddingTop: 4 }}>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 22,
          color: tokens.ink,
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        Everything is open to you
      </Text>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 13,
          color: tokens.inkSecondary,
          textAlign: 'center',
          maxWidth: 320,
          alignSelf: 'center',
          marginBottom: 14,
          lineHeight: 18,
        }}
      >
        These were the chapters waiting behind a lock.
      </Text>

      <View style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <View
          style={{
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            borderRadius: 14,
            paddingVertical: 6,
            paddingHorizontal: 6,
            backgroundColor: tokens.bgSoft,
            gap: 2,
          }}
        >
          {rows.map((c, i) => (
            <UnlockRow key={c.id} chapter={c} reveal={reveal} accent={accent} index={i} />
          ))}
        </View>

        {/* Blur layer — sits over the entire chapter list and fades out as
            the cascade progresses, giving the moment a "out of focus → in
            focus" feel. Static blur intensity, animated opacity (cheap). */}
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
            blurStyle,
          ]}
        >
          <BlurView
            intensity={18}
            tint="default"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>

      <Animated.Text
        style={[
          {
            fontFamily: serifItalic,
            fontSize: 13,
            color: accent,
            textAlign: 'center',
            marginTop: 14,
          },
          captionStyle,
        ]}
      >
        All unlocked.
      </Animated.Text>
    </View>
  );
}

function UnlockRow({
  chapter,
  reveal,
  accent,
  index,
}: {
  chapter: ChapterMeta;
  reveal: { value: number };
  accent: string;
  index: number;
}) {
  const { tokens } = useSettings();
  const wasLocked = !chapter.isFree;

  // Per-row stagger so the unlock cascades top to bottom. Free rows skip
  // the lock entirely — they were already accessible. The lock and the
  // opacity ramp use different windows: locks pop off quickly (first ~12%
  // of each row's window), opacity rises slowly across the full window.
  const PER_ROW = 0.05; // each row starts 5% later than the previous one
  const LOCK_FADE = 0.12; // tight window — locks should "snap" off
  const OPACITY_FADE = 0.45; // longer, smoother brightening of the row

  const rowStyle = useAnimatedStyle(() => {
    if (!wasLocked) return { opacity: 1 };
    const start = Math.min(0.55, index * PER_ROW);
    const end = Math.min(1, start + OPACITY_FADE);
    const t = Math.max(0, Math.min(1, (reveal.value - start) / (end - start)));
    return { opacity: 0.5 + 0.5 * t };
  });

  const lockStyle = useAnimatedStyle(() => {
    if (!wasLocked) return { opacity: 0, transform: [{ scale: 0.6 }] };
    const start = Math.min(0.55, index * PER_ROW);
    const end = start + LOCK_FADE;
    const t = Math.max(0, Math.min(1, (reveal.value - start) / (end - start)));
    return { opacity: 1 - t, transform: [{ scale: 1 - 0.45 * t }] };
  });

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingVertical: 8,
          gap: 10,
        },
        rowStyle,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: serif,
            fontSize: 14,
            color: tokens.ink,
          }}
        >
          {chapter.title}
        </Text>
        {chapter.subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: serifItalic,
              fontSize: 11,
              marginTop: 1,
              color: tokens.inkSecondary,
            }}
          >
            {chapter.subtitle}
          </Text>
        ) : null}
      </View>
      <Animated.View style={lockStyle}>
        <Ionicons name="lock-closed" size={13} color={tokens.inkTertiary} />
      </Animated.View>
    </Animated.View>
  );
}

/* -------------- STEP 3: PREFERENCES -------------- */

function PreferencesStep() {
  const { theme, fontSize, accentByTheme, accent, tokens, update } = useSettings();
  const themeAccent = accentByTheme[theme] ?? accent;

  const setAccent = (hex: string) => {
    update({ accentByTheme: { ...accentByTheme, [theme]: hex } });
  };

  return (
    <View style={{ gap: 18 }}>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 20,
          color: tokens.ink,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        Reading preferences
      </Text>

      <View>
        <StepLabel>Theme</StepLabel>
        <View className="flex-row" style={{ gap: 6 }}>
          {THEME_CARDS.map((t) => {
            const selected = theme === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => update({ theme: t.id as ThemeId })}
                className="flex-1 items-center rounded-2xl p-2 active:opacity-80"
                style={{
                  borderWidth: 1,
                  borderColor: selected ? accent : tokens.pillBorder,
                  backgroundColor: selected ? withAlpha(accent, 0.1) : 'transparent',
                }}
              >
                <View
                  className="h-9 w-full items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: t.bg,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.06)',
                  }}
                >
                  <Text style={{ fontFamily: serif, fontSize: 14, color: t.ink }}>Aa</Text>
                </View>
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 11,
                    marginTop: 4,
                    color: selected ? accent : tokens.inkSecondary,
                    fontWeight: selected ? '600' : '500',
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <View className="flex-row justify-between items-center mb-2">
          <StepLabel>Text size</StepLabel>
          <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>
            {fontSize}px
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Text style={{ fontFamily: serif, fontSize: 13, color: tokens.inkSecondary }}>A</Text>
          <View className="flex-1">
            <Slider
              minValue={12}
              maxValue={28}
              step={1}
              value={fontSize}
              onChange={(v) => update({ fontSize: Array.isArray(v) ? v[0] : v })}
            >
              <Slider.Track>
                <Slider.Fill style={{ backgroundColor: accent }} />
                <Slider.Thumb
                  styles={{
                    thumbContainer: { backgroundColor: accent },
                    thumbKnob: { backgroundColor: '#ffffff' },
                  }}
                />
              </Slider.Track>
            </Slider>
          </View>
          <Text style={{ fontFamily: serif, fontSize: 22, color: tokens.inkSecondary }}>A</Text>
        </View>
      </View>

      <View
        className="rounded-xl px-3 py-3"
        style={{ backgroundColor: tokens.bgSoft, borderWidth: 1, borderColor: tokens.pillBorder }}
      >
        <Text
          style={{
            fontFamily: serif,
            fontSize,
            lineHeight: fontSize * 1.65,
            color: tokens.ink,
          }}
        >
          The child hesitates before realizing that, actually, the decision has already been made and the journey already begun.
        </Text>
      </View>

      <View>
        <View className="flex-row justify-between items-center mb-2">
          <StepLabel>Accent color</StepLabel>
          <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>
            Saved per theme
          </Text>
        </View>
        <AccentMini value={themeAccent} onChange={setAccent} />
      </View>
    </View>
  );
}

function AccentMini({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const { tokens } = useSettings();
  const onPickerChange = (color: { hex: string }) => {
    'worklet';
    runOnJS(onChange)(color.hex);
  };

  return (
    <View
      className="rounded-xl p-3"
      style={{ backgroundColor: tokens.bg, borderWidth: 1, borderColor: tokens.pillBorder }}
    >
      <ColorPicker
        value={value}
        sliderThickness={16}
        thumbSize={18}
        thumbShape="ring"
        onChange={onPickerChange}
        boundedThumb
      >
        <Panel1 style={{ borderRadius: 10, height: 120 }} />
        <View style={{ marginTop: 10 }}>
          <HueSlider style={{ borderRadius: 999 }} />
        </View>
      </ColorPicker>
    </View>
  );
}

/* -------------- STEP 4: PROFILE -------------- */

function ProfileStep() {
  const { tokens, refreshProfile, update } = useSettings();
  const setProfile = (next: RefreshProfile) => update({ refreshProfile: next });

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <View style={{ gap: 16 }}>
      <View className="items-center" style={{ gap: 4, marginTop: 4 }}>
        <Text style={{ fontFamily: serif, fontSize: 20, color: tokens.ink }}>
          Personalize your refresh
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 12,
            color: tokens.inkTertiary,
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          Helps the refresh button rewrite examples in your voice.
        </Text>
      </View>

      <View>
        <StepLabel>Decade you grew up in</StepLabel>
        <View
          className="flex-row flex-wrap justify-center"
          style={{ gap: 6 }}
        >
          {DECADES.map((d) => (
            <PillButton
              key={d}
              selected={refreshProfile.decade === d}
              onPress={() => setProfile({ ...refreshProfile, decade: d })}
              label={d}
            />
          ))}
        </View>
      </View>

      <View>
        <StepLabel>Humor preference (pick any)</StepLabel>
        <View className="flex-row flex-wrap justify-center" style={{ gap: 6 }}>
          {HUMOR_OPTIONS.map((h) => (
            <PillButton
              key={h}
              selected={refreshProfile.humor.includes(h)}
              onPress={() =>
                setProfile({ ...refreshProfile, humor: toggle(refreshProfile.humor, h) })
              }
              label={h}
            />
          ))}
        </View>
      </View>

      <View>
        <StepLabel>Cultural world (pick any)</StepLabel>
        <View className="flex-row flex-wrap justify-center" style={{ gap: 6 }}>
          {CULTURE_OPTIONS.map((c) => (
            <PillButton
              key={c}
              selected={refreshProfile.culture.includes(c)}
              onPress={() =>
                setProfile({ ...refreshProfile, culture: toggle(refreshProfile.culture, c) })
              }
              label={c}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

/* -------------- STEP 5: MODES — INTERACTIVE TRY-IT -------------- */

function ModesStep() {
  const { tokens } = useSettings();
  return (
    <View style={{ gap: 14 }}>
      <View className="items-center" style={{ gap: 4, marginTop: 4 }}>
        <Text style={{ fontFamily: serif, fontSize: 20, color: tokens.ink }}>
          Two speed-reading modes
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 12,
            color: tokens.inkTertiary,
            textAlign: 'center',
          }}
        >
          Try each one on a real paragraph. Find them later in Settings → Reading.
        </Text>
      </View>

      <BionicTryCard />
      <RsvpTryCard />
    </View>
  );
}

/**
 * Bionic with a live toggle. The same paragraph re-renders on toggle so
 * readers can see the difference immediately on real prose.
 */
function BionicTryCard() {
  const { tokens, accent } = useSettings();
  const [on, setOn] = useState(true);
  return (
    <View
      className="rounded-xl px-3 py-3"
      style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
    >
      <View className="flex-row items-center justify-between" style={{ marginBottom: 6 }}>
        <StepLabel>Bionic reading</StepLabel>
        <ToggleSwitch value={on} onChange={setOn} accent={accent} bg={tokens.bgSoft} />
      </View>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 11,
          color: tokens.inkTertiary,
          marginBottom: 8,
          lineHeight: 14,
        }}
      >
        Bolds the first few letters of each word to give your eye a fixation point.
      </Text>
      <View className="rounded-lg px-3 py-2" style={{ backgroundColor: tokens.bgSoft }}>
        <Text style={{ fontFamily: serif, fontSize: 14, lineHeight: 22, color: tokens.ink }}>
          {tokenizeWords(SAMPLE_PARAGRAPH).map((tok, i) => {
            const isWord = /^\p{L}/u.test(tok);
            if (!isWord || !on) return <Text key={i}>{tok}</Text>;
            const [head, tail] = splitBionic(tok);
            return (
              <Text key={i}>
                <Text style={{ fontWeight: '700' }}>{head}</Text>
                {tail}
              </Text>
            );
          })}
        </Text>
      </View>
    </View>
  );
}

/**
 * RSVP with a real Play button. Streams the sample paragraph word-by-word at
 * the user's saved RSVP speed; pauses, replays, advances when finished.
 */
function RsvpTryCard() {
  const { tokens, accent, rsvpWpm } = useSettings();
  const words = useMemo(
    () => SAMPLE_PARAGRAPH.split(/\s+/).filter(Boolean),
    [],
  );
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (idx >= words.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(
      () => setIdx((i) => i + 1),
      tickMs(words[idx], rsvpWpm ?? 300),
    );
    return () => clearTimeout(t);
  }, [playing, idx, words, rsvpWpm]);

  const word = words[idx] ?? '';
  const orp = orpIndex(word);
  const finished = idx >= words.length - 1 && !playing;

  const togglePlay = () => {
    if (finished) {
      setIdx(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <View
      className="rounded-xl px-3 py-3"
      style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
    >
      <StepLabel>Rapid serial presentation</StepLabel>
      <Text
        style={{
          fontFamily: serif,
          fontSize: 11,
          color: tokens.inkTertiary,
          marginBottom: 8,
          lineHeight: 14,
        }}
      >
        One word at a time. Your eyes stay still; the text moves.
      </Text>

      <View
        className="items-center justify-center rounded-lg"
        style={{ backgroundColor: tokens.bgSoft, height: 84 }}
      >
        <Text
          style={{
            fontFamily: serif,
            fontSize: 30,
            color: tokens.ink,
            letterSpacing: 0.3,
          }}
        >
          <Text>{word.slice(0, orp)}</Text>
          <Text style={{ color: accent }}>{word.charAt(orp)}</Text>
          <Text>{word.slice(orp + 1)}</Text>
        </Text>
      </View>

      <View className="flex-row items-center justify-between" style={{ marginTop: 10 }}>
        <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>
          {idx + 1} / {words.length}
        </Text>
        <Pressable
          onPress={togglePlay}
          accessibilityLabel={playing ? 'Pause' : finished ? 'Replay' : 'Play'}
          className="flex-row items-center rounded-full active:opacity-70"
          style={{
            paddingLeft: 12,
            paddingRight: 14,
            paddingVertical: 7,
            backgroundColor: accent,
            gap: 6,
          }}
        >
          <Ionicons
            name={playing ? 'pause' : finished ? 'refresh' : 'play'}
            size={12}
            color="#fff"
          />
          <Text style={{ fontFamily: serif, fontSize: 12, fontWeight: '600', color: '#fff' }}>
            {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ToggleSwitch({
  value,
  onChange,
  accent,
  bg,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  accent: string;
  bg: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        backgroundColor: value ? accent : bg,
        padding: 2,
        justifyContent: 'center',
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          backgroundColor: '#fff',
        }}
      />
    </Pressable>
  );
}

/* -------------- STEP 6: REFRESH — INTERACTIVE TRY-IT -------------- */

/**
 * Real paragraph + a refresh icon they can actually tap. For now we cycle
 * through canned variants tailored loosely to their decade/humor — once the
 * Anthropic key is live, swap `cannedRewrite()` for a real Edge Function call.
 */
function RefreshStep() {
  const { tokens, accent, refreshProfile } = useSettings();

  const REWRITES = useMemo(
    () => buildCannedRewrites(refreshProfile.decade ?? undefined),
    [refreshProfile.decade],
  );
  const [idx, setIdx] = useState(0);

  return (
    <View style={{ gap: 12 }}>
      <View className="items-center" style={{ gap: 4, marginTop: 4 }}>
        <Text style={{ fontFamily: serif, fontSize: 20, color: tokens.ink }}>
          Refresh in your voice
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 12,
            color: tokens.inkTertiary,
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          Some paragraphs end in a refresh icon. Tap it and the example rewrites itself in your decade, humor, and cultural world.
        </Text>
      </View>

      <View
        className="rounded-xl px-3 py-3"
        style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
      >
        <Text
          style={{ fontFamily: serif, fontSize: 14, lineHeight: 22, color: tokens.ink }}
        >
          {REWRITES[idx]}
          {'  '}
          <Text
            onPress={() => setIdx((i) => (i + 1) % REWRITES.length)}
            style={{ color: accent }}
          >
            <Ionicons name="refresh-outline" size={13} color={accent} />
          </Text>
        </Text>
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 11,
            color: tokens.inkTertiary,
            marginTop: 8,
          }}
        >
          Tap the refresh icon → variant {idx + 1} of {REWRITES.length}.
        </Text>
      </View>
    </View>
  );
}

function buildCannedRewrites(decade?: Decade): string[] {
  // Three flavors loosely riffing off the user's decade. Replaced by real
  // Edge Function output once the AI plumbing is connected.
  const base = SAMPLE_PARAGRAPH;
  const eighties =
    'No matter how many supplements the biohackers stack, you and I are still on the same VHS tape — body and mind running down to the static at the end. A few hundred extra years would only delay the credits.';
  const nineties =
    'You can subscribe to every longevity podcast and AI prophet, but the body is still on dial-up: it loads, it lags, it eventually disconnects. Even an extra few centuries is just a longer buffering screen.';
  const aughts =
    'No matter how many longevity influencers you follow, the body is a battery that drains. Even a few hundred extra years of charge is still a battery that ends up at zero.';
  if (decade === '70s' || decade === '80s') return [base, eighties, aughts];
  if (decade === '90s') return [base, nineties, aughts];
  return [base, aughts, nineties];
}

/* -------------- STEP 7: TRY-IT — GLOSSARY + FOOTNOTE -------------- */

function TryItStep() {
  const { tokens } = useSettings();
  return (
    <View style={{ gap: 12 }}>
      <View className="items-center" style={{ gap: 4, marginTop: 4 }}>
        <Text style={{ fontFamily: serif, fontSize: 20, color: tokens.ink }}>
          Two more touches worth knowing
        </Text>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 12,
            color: tokens.inkTertiary,
            textAlign: 'center',
          }}
        >
          Try each one — they’re sprinkled throughout the book.
        </Text>
      </View>

      <GlossaryDemo />
      <FootnoteDemo />
    </View>
  );
}

function GlossaryDemo() {
  const { tokens, accent } = useSettings();
  const [show, setShow] = useState(false);
  return (
    <View
      className="rounded-xl px-3 py-3"
      style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
    >
      <StepLabel>Dashed terms</StepLabel>
      <Text style={{ fontFamily: serif, fontSize: 13, color: tokens.ink, lineHeight: 18 }}>
        Pali and Sanskrit terms have a dashed underline. Tap{' '}
        <Text
          onPress={() => setShow((v) => !v)}
          style={{
            color: show ? accent : tokens.ink,
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
            textDecorationColor: show ? accent : withAlpha(accent, 0.7),
          }}
        >
          anicca
        </Text>
        {' '}for a Webster-style card with pronunciation, definition, and the line in context.
      </Text>

      {show ? (
        <View
          className="mt-2 rounded-lg px-3 py-2"
          style={{
            backgroundColor: withAlpha(accent, 0.08),
            borderWidth: 1,
            borderColor: withAlpha(accent, 0.4),
          }}
        >
          <View className="flex-row items-baseline" style={{ gap: 8 }}>
            <Text style={{ fontFamily: serifItalic, fontSize: 14, color: accent }}>
              anicca
            </Text>
            <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>
              ah-NEE-chah · Pali
            </Text>
          </View>
          <Text
            style={{
              fontFamily: serif,
              fontSize: 12,
              color: tokens.inkSecondary,
              marginTop: 4,
              lineHeight: 16,
            }}
          >
            Impermanence — the characteristic of everything arising and passing away.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function FootnoteDemo() {
  const { tokens, accent } = useSettings();
  const [show, setShow] = useState(false);
  const [streamed, setStreamed] = useState('');
  const NOTE = 'A footnote — the author whispering an aside without breaking the flow of prose.';
  useEffect(() => {
    if (!show) {
      setStreamed('');
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      if (i > NOTE.length) {
        clearInterval(id);
      } else {
        setStreamed(NOTE.slice(0, i));
      }
    }, 18);
    return () => clearInterval(id);
  }, [show]);

  return (
    <View
      className="rounded-xl px-3 py-3"
      style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
    >
      <StepLabel>Footnotes</StepLabel>
      <Text style={{ fontFamily: serif, fontSize: 13, color: tokens.ink, lineHeight: 18 }}>
        Watch for this clipboard icon{' '}
        <Text onPress={() => setShow((v) => !v)} style={{ color: accent }}>
          <Ionicons name="document-text-outline" size={13} color={accent} />
        </Text>
        {' '}— tap it and the note types itself out inline so you don’t lose your place.
        {show ? (
          <Text style={{ fontFamily: serifItalic, color: tokens.inkSecondary }}>
            {' '}{streamed}
            {streamed.length < NOTE.length ? (
              <Text style={{ color: tokens.inkSecondary }}>|</Text>
            ) : (
              <Text onPress={() => setShow(false)} style={{ color: tokens.inkSecondary, fontWeight: '700' }}>
                {' '}×
              </Text>
            )}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}
