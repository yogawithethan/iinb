import { useEffect, useState } from 'react';
import { Image, Keyboard, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Slider } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { PREMIUM_THEMES, THEME_CARDS, withAlpha, type ThemeId } from '@/lib/theme';
import { AuthForm } from './AuthForm';
import { useAuth } from '@/lib/AuthContext';
import chaptersJson from '@/content/chapters.json';
import partsJson from '@/content/parts.json';

type Step = 'title' | 'beta' | 'note' | 'toc' | 'tiers' | 'preferences' | 'account';
const ORDER: Step[] = ['title', 'beta', 'note', 'toc', 'tiers', 'preferences', 'account'];

const SIGNATURE = require('@/assets/images/ethan-signature.png');
const CATERPILLAR = require('@/assets/images/caterpillar.png');
const COCOON = require('@/assets/images/cocoon.png');
const BUTTERFLY = require('@/assets/images/butterfly.png');
const COVER = require('@/assets/images/cover_image.png');

export function FirstLaunchOnboarding() {
  const settings = useSettings();
  const { tokens, accent } = settings;
  const [step, setStep] = useState<Step>('title');
  const idx = ORDER.indexOf(step);

  // Dismiss the keyboard whenever we leave the account step (or any step
  // change) so it doesn't linger from a previous focus or pop up unexpectedly.
  useEffect(() => {
    Keyboard.dismiss();
  }, [step]);

  const finish = () => {
    Keyboard.dismiss();
    settings.update({ firstLaunched: true });
  };
  const goNext = () => {
    if (idx < ORDER.length - 1) setStep(ORDER[idx + 1]);
    else finish();
  };
  const goBack = () => {
    if (idx > 0) setStep(ORDER[idx - 1]);
  };

  return (
    <View
      className="absolute inset-0"
      style={{ zIndex: 200, backgroundColor: tokens.bg }}
    >
      {/* Skip */}
      {step !== 'title' ? (
        <Pressable
          onPress={finish}
          accessibilityLabel="Skip"
          style={{
            position: 'absolute',
            top: 64,
            right: 18,
            zIndex: 10,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontFamily: serif,
              fontSize: 12,
              color: tokens.inkTertiary,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Skip
          </Text>
        </Pressable>
      ) : null}

      {/* Progress dots */}
      {step !== 'title' ? (
        <View
          style={{
            position: 'absolute',
            top: 70,
            left: 0,
            right: 0,
            zIndex: 10,
            alignItems: 'center',
          }}
        >
          <View className="flex-row" style={{ gap: 6 }}>
            {ORDER.slice(1).map((_, i) => {
              const reachedIdx = i + 1; // skip title in dot row
              const isActive = reachedIdx === idx;
              const isPast = reachedIdx < idx;
              return (
                <View
                  key={i}
                  style={{
                    height: 5,
                    width: isActive ? 20 : 5,
                    borderRadius: 999,
                    backgroundColor:
                      isActive || isPast ? accent : withAlpha(tokens.inkTertiary, 0.3),
                  }}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <Animated.View
        key={step}
        entering={FadeIn.duration(280).easing(Easing.out(Easing.quad))}
        exiting={FadeOut.duration(160)}
        style={{ flex: 1 }}
      >
        {step === 'title' && <TitleStep onNext={goNext} />}
        {step === 'beta' && <BetaStep />}
        {step === 'note' && <NoteStep />}
        {step === 'toc' && <TocStep />}
        {step === 'tiers' && <TiersStep />}
        {step === 'preferences' && <PreferencesStep />}
        {step === 'account' && (
          <AccountStep onSuccess={finish} onSkip={finish} onBack={goBack} />
        )}
      </Animated.View>

      {/* Footer nav — hidden on title (auto) and account (handled inline) */}
      {step !== 'title' && step !== 'account' ? (
        <View
          className="flex-row items-center justify-between"
          style={{
            position: 'absolute',
            bottom: 36,
            left: 24,
            right: 24,
            zIndex: 10,
          }}
        >
          <Pressable onPress={goBack} className="px-3 py-2 active:opacity-60">
            <Text
              style={{ fontFamily: serif, fontSize: 13, color: tokens.inkTertiary }}
            >
              Back
            </Text>
          </Pressable>
          <Pressable
            onPress={goNext}
            className="rounded-full px-6 py-3 active:opacity-80"
            style={{ backgroundColor: accent }}
          >
            <Text
              style={{
                fontFamily: serif,
                fontSize: 14,
                fontWeight: '600',
                color: '#ffffff',
              }}
            >
              {idx === ORDER.length - 2 ? 'Almost there' : 'Next'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/* ------------------------------ STEP 1 — TITLE ------------------------------ */

function TitleStep({ onNext }: { onNext: () => void }) {
  const { tokens, accent } = useSettings();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        gap: 24,
      }}
    >
      {/* Eyebrow — same style as "A NOTE FROM ETHAN". */}
      <Animated.Text
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(80)}
        style={{
          position: 'absolute',
          top: 110,
          fontFamily: serif,
          fontSize: 11,
          letterSpacing: 1.8,
          color: tokens.inkTertiary,
          textTransform: 'uppercase',
        }}
      >
        Welcome
      </Animated.Text>

      {/* Book cover — title is on the cover artwork itself. expo-image is
          much faster at decoding static PNGs than RN's built-in Image. */}
      <Animated.View entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(220)}>
        <ExpoImage
          source={COVER}
          style={{ width: 240, height: 360, borderRadius: 6 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
      </Animated.View>

      {/* Begin button — same accent pill as "Next". */}
      <Animated.View
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(560)}
        style={{ position: 'absolute', bottom: 56 }}
      >
        <Pressable
          onPress={onNext}
          accessibilityLabel="Begin"
          className="rounded-full px-8 py-3 active:opacity-80"
          style={{ backgroundColor: accent }}
        >
          <Text
            style={{
              fontFamily: serif,
              fontSize: 15,
              fontWeight: '600',
              color: '#ffffff',
            }}
          >
            Begin
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* -------------------------- STEP 2 — BETA / NEW THING -------------------------- */

function BetaStep() {
  const { tokens, accent } = useSettings();
  const features: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: 'refresh', text: 'Examples refresh in your own voice.' },
    { icon: 'sparkles', text: 'Ask the book anything — answers come from the text itself.' },
    { icon: 'play', text: 'Listen with karaoke-synced narration.' },
    { icon: 'eye', text: 'Absorb with bionic and speed-reading modes.' },
    { icon: 'book', text: 'Glossary cards inline for every Pali and Sanskrit term.' },
    { icon: 'film', text: 'Interactive — videos and more on the way.' },
  ];
  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 100,
        paddingBottom: 110,
        gap: 14,
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(60)}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: withAlpha(accent, 0.14),
          borderWidth: 1,
          borderColor: withAlpha(accent, 0.45),
        }}
      >
        <Text
          style={{
            fontFamily: serif,
            fontSize: 11,
            letterSpacing: 1.8,
            color: accent,
            fontWeight: '700',
          }}
        >
          BETA
        </Text>
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(140)}
        style={{
          fontFamily: serif,
          fontSize: 26,
          color: tokens.ink,
          textAlign: 'center',
        }}
      >
        A new kind of book.
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(220)}
        style={{
          fontFamily: serifItalic,
          fontSize: 14,
          color: tokens.inkSecondary,
          textAlign: 'center',
          lineHeight: 21,
          maxWidth: 320,
        }}
      >
        An entire app built around a single book — one of the first of its kind.
      </Animated.Text>

      <View style={{ width: '100%', maxWidth: 380, gap: 10, marginTop: 4 }}>
        {features.map((f, i) => (
          <Animated.View
            key={i}
            entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(320 + i * 70)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: tokens.pillBorder,
              backgroundColor: tokens.bgSoft,
            }}
          >
            <View
              style={{
                height: 30,
                width: 30,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: withAlpha(accent, 0.18),
              }}
            >
              <Ionicons name={f.icon} size={14} color={accent} />
            </View>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 13,
                color: tokens.ink,
                flex: 1,
                lineHeight: 18,
              }}
            >
              {f.text}
            </Text>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

/* ----------------------------- STEP 3 — NOTE FROM ETHAN ----------------------------- */

function NoteStep() {
  const { tokens } = useSettings();
  const paragraphs = [
    'This book took me over seven years to write.',
    'It answers just three questions: why do we suffer, how to stop, and what happens when we do?',
    "I built this app because I wanted readers to feel walked alongside, not lectured at. Stay as long as you'd like.",
  ];
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 18,
      }}
    >
      <Animated.Text
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(60)}
        style={{
          fontFamily: serif,
          fontSize: 11,
          letterSpacing: 1.8,
          color: tokens.inkTertiary,
          textTransform: 'uppercase',
        }}
      >
        A note from Ethan
      </Animated.Text>
      {paragraphs.map((p, i) => (
        <Animated.Text
          key={i}
          entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(180 + i * 220)}
          style={{
            fontFamily: serifItalic,
            fontSize: 17,
            lineHeight: 28,
            color: tokens.ink,
            textAlign: 'center',
            maxWidth: 360,
          }}
        >
          {p}
        </Animated.Text>
      ))}
      <Animated.View entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(180 + paragraphs.length * 220)}>
        <Image
          source={SIGNATURE}
          style={{
            height: 56,
            width: 180,
            tintColor: tokens.ink,
            marginTop: 4,
          }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

/* ----------------------- STEP 4 — TABLE OF CONTENTS ----------------------- */

type TocChapter = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  part: string;
};
type TocPart = {
  id: string;
  numeral: string;
  title: string;
  matchesChapterPart: string;
};

const TOC_CHAPTERS = (chaptersJson as TocChapter[]).filter(
  (c) => c.id !== 'preface',
);
const TOC_PARTS = partsJson as TocPart[];
const TOC_PART_BY_LABEL = new Map(TOC_PARTS.map((p) => [p.matchesChapterPart, p]));

function TocStep() {
  const { tokens, accent } = useSettings();

  // Build display rows: chapter rows interleaved with part dividers.
  type Row =
    | { kind: 'chapter'; titleLeft: string; titleRight: string; sub: string }
    | { kind: 'part'; numeral: string; title: string }
    | { kind: 'separator' };

  const rows: Row[] = [];
  let prevPart = '';
  for (const c of TOC_CHAPTERS) {
    const isRealPart = /^Part /i.test(c.part);
    // Whenever the part changes, emit a small separator line — even if the
    // new group has no PART header (Introduction → Part I, Part III → Conclusion).
    if (prevPart && c.part !== prevPart) {
      rows.push({ kind: 'separator' });
    }
    if (isRealPart && c.part !== prevPart) {
      const part = TOC_PART_BY_LABEL.get(c.part);
      if (part) rows.push({ kind: 'part', numeral: part.numeral, title: part.title });
    }
    prevPart = c.part;

    const colonIdx = c.title.indexOf(':');
    const titleLeft = colonIdx >= 0 ? c.title.slice(0, colonIdx).trim() : c.title;
    const titleRight = colonIdx >= 0 ? c.title.slice(colonIdx + 1).trim() : '';
    const sub = c.subtitle?.trim() || (isRealPart ? '' : c.part);
    rows.push({ kind: 'chapter', titleLeft, titleRight, sub });
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 96,
        paddingBottom: 110,
        flexGrow: 1,
        gap: 14,
      }}
    >
      <View style={{ alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 24,
            color: tokens.ink,
            textAlign: 'center',
          }}
        >
          Ignorance to Bliss
        </Text>
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 13,
            color: tokens.inkSecondary,
            textAlign: 'center',
            lineHeight: 19,
            maxWidth: 360,
          }}
        >
          A journey from Ignorance (0, as in absence){'\n'}
          to Bliss (X, as in “10” or “marks the spot”).
        </Text>
      </View>

      {rows.map((row, i) => {
        // Staggered entrance — each row fades up after the previous.
        const delay = 80 + i * 90;
        if (row.kind === 'separator') {
          return (
            <Animated.View
              key={`s-${i}`}
              entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(delay)}
              style={{ alignItems: 'center', marginVertical: 4 }}
            >
              <View
                style={{
                  height: 1,
                  width: 36,
                  backgroundColor: withAlpha(tokens.inkTertiary, 0.4),
                }}
              />
            </Animated.View>
          );
        }
        if (row.kind === 'part') {
          return (
            <Animated.View
              key={`p-${i}`}
              entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(delay)}
              style={{ alignItems: 'center', marginTop: 4, marginBottom: 6 }}
            >
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 11,
                  letterSpacing: 2.4,
                  color: accent,
                  textTransform: 'uppercase',
                  fontWeight: '700',
                }}
              >
                {row.numeral} : {row.title}
              </Text>
            </Animated.View>
          );
        }
        return (
          <Animated.View
            key={`c-${i}`}
            entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(delay)}
            style={{
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: tokens.pillBorder,
              backgroundColor: tokens.bgSoft,
              gap: 2,
            }}
          >
            <Text
              style={{
                fontFamily: serif,
                fontSize: 15,
                color: tokens.ink,
                textAlign: 'center',
              }}
            >
              {row.titleLeft}
              {row.titleRight ? ' : ' : ''}
              <Text style={{ fontWeight: '600' }}>{row.titleRight}</Text>
            </Text>
            {row.sub ? (
              <Text
                style={{
                  fontFamily: serifItalic,
                  fontSize: 12,
                  color: tokens.inkTertiary,
                  textAlign: 'center',
                }}
              >
                {row.sub}
              </Text>
            ) : null}
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

/* ----------------------------- STEP 5 — WHAT YOU GET ----------------------------- */

function TiersStep() {
  const { tokens, accent } = useSettings();
  const tiers: {
    icon: number;
    headline: string;
    label: string;
    body: string;
  }[] = [
    {
      icon: CATERPILLAR,
      headline: 'Free',
      label: 'The Preface',
      body: 'On the house. Read enough to know if it speaks to you.',
    },
    {
      icon: COCOON,
      headline: Platform.OS === 'ios' ? 'Sign in' : 'Sign up',
      label: 'Chapter 0 + Chapter 1',
      body:
        Platform.OS === 'ios'
          ? 'Two more chapters, free. Sign in with the email you used elsewhere to sync your progress.'
          : "Two more chapters, free. We'll save your place across devices.",
    },
    {
      icon: BUTTERFLY,
      headline: Platform.OS === 'ios' ? 'Restore' : '$22',
      label: 'The whole book',
      body:
        Platform.OS === 'ios'
          ? 'Already bought it on the web? Sign in here, or redeem a code in Profile. The whole book unlocks.'
          : 'Every chapter, AI companion, narration, refresh in your voice.',
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 28,
        paddingTop: 110,
        paddingBottom: 120,
        flexGrow: 1,
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <Animated.Text
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(60)}
        style={{
          fontFamily: serif,
          fontSize: 24,
          color: tokens.ink,
          textAlign: 'center',
          marginBottom: 4,
        }}
      >
        How it works
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(160)}
        style={{
          fontFamily: serifItalic,
          fontSize: 13,
          color: tokens.inkTertiary,
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        Buy once. Read on any device. Keep your spot.
      </Animated.Text>

      {tiers.map((t, i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.duration(680).easing(Easing.out(Easing.cubic)).delay(260 + i * 130)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: i === tiers.length - 1 ? withAlpha(accent, 0.45) : tokens.pillBorder,
            backgroundColor:
              i === tiers.length - 1 ? withAlpha(accent, 0.06) : 'transparent',
          }}
        >
          <Image
            source={t.icon}
            style={{
              height: 40,
              width: 40,
              tintColor: i === tiers.length - 1 ? accent : tokens.ink,
            }}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <View className="flex-row items-baseline" style={{ gap: 8 }}>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 15,
                  fontWeight: '600',
                  color: tokens.ink,
                }}
              >
                {t.headline}
              </Text>
              <Text
                style={{
                  fontFamily: serifItalic,
                  fontSize: 12,
                  color: tokens.inkTertiary,
                }}
              >
                {t.label}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkSecondary,
                marginTop: 2,
                lineHeight: 17,
              }}
            >
              {t.body}
            </Text>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

/* ----------------------------- STEP 5 — PREFERENCES ----------------------------- */

function PreferencesStep() {
  // No tap-anywhere here: theme cards and the slider are interactive, so an
  // empty-area tap to advance would be too easy to fat-finger.
  const { theme, fontSize, accent, tokens, update } = useSettings();

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 24,
        paddingTop: 110,
        paddingBottom: 120,
        flexGrow: 1,
        justifyContent: 'center',
        gap: 18,
      }}
    >
      <Text
        style={{
          fontFamily: serif,
          fontSize: 24,
          color: tokens.ink,
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        Make it yours
      </Text>
      <Text
        style={{
          fontFamily: serifItalic,
          fontSize: 13,
          color: tokens.inkTertiary,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        You can change these any time in Settings.
      </Text>

      {/* Theme — sepia + oled are premium */}
      <View>
        <SectionLabel>Theme</SectionLabel>
        <View className="flex-row" style={{ gap: 6 }}>
          {THEME_CARDS.map((t) => {
            const selected = theme === t.id;
            const locked = PREMIUM_THEMES.includes(t.id as ThemeId);
            return (
              <Pressable
                key={t.id}
                onPress={() => {
                  if (locked) return;
                  update({ theme: t.id as ThemeId });
                }}
                disabled={locked}
                className="flex-1 items-center rounded-2xl p-2 active:opacity-80"
                style={{
                  borderWidth: 1,
                  borderColor: selected ? accent : tokens.pillBorder,
                  backgroundColor: selected ? withAlpha(accent, 0.1) : 'transparent',
                  opacity: locked ? 0.55 : 1,
                  position: 'relative',
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
                {locked ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      height: 18,
                      width: 18,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: withAlpha(accent, 0.18),
                    }}
                  >
                    <Ionicons name="lock-closed" size={9} color={accent} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Font size */}
      <View>
        <View className="flex-row justify-between items-center mb-2">
          <SectionLabel>Text size</SectionLabel>
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

      {/* Live preview */}
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
          The child hesitates before realizing that, actually, the decision has
          already been made and the journey already begun.
        </Text>
      </View>

      {/* Locked premium teaser — custom accent picker. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: tokens.pillBorder,
          backgroundColor: tokens.bgSoft,
          opacity: 0.85,
        }}
      >
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center" style={{ gap: 8, marginBottom: 4 }}>
            <Text style={{ fontFamily: serif, fontSize: 14, color: tokens.ink }}>
              Custom accent color
            </Text>
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: withAlpha(accent, 0.14),
                borderWidth: 1,
                borderColor: withAlpha(accent, 0.4),
              }}
            >
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 9,
                  letterSpacing: 1.4,
                  color: accent,
                  fontWeight: '700',
                }}
              >
                PREMIUM
              </Text>
            </View>
          </View>
          <Text
            style={{
              fontFamily: serif,
              fontSize: 12,
              color: tokens.inkTertiary,
              lineHeight: 17,
            }}
          >
            Tint the app with any color you like. Saved per theme.
          </Text>
        </View>
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: withAlpha(accent, 0.18) }}
        >
          <Ionicons name="lock-closed" size={13} color={accent} />
        </View>
      </View>
    </ScrollView>
  );
}

/* ----------------------------- STEP 6 — ACCOUNT ----------------------------- */

function AccountStep({
  onSuccess,
  onSkip,
  onBack,
}: {
  onSuccess: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const { tokens } = useSettings();
  const { user } = useAuth();
  useEffect(() => {
    if (user) onSuccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const heading = 'Your Yoga With Ethan account';
  const subheading = Platform.OS === 'ios'
    ? 'Use one secure email link to restore your purchase and reading life on this device.'
    : 'Use one secure email link to pick up where you left off across the Yoga With Ethan ecosystem.';

  return (
    <View style={{ flex: 1 }}>
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 22,
        paddingTop: 96,
        paddingBottom: 90,
        flexGrow: 1,
        gap: 14,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Heading */}
      <View className="items-center" style={{ gap: 4, marginBottom: 4 }}>
        <Text
          style={{
            fontFamily: serif,
            fontSize: 22,
            color: tokens.ink,
            textAlign: 'center',
          }}
        >
          {heading}
        </Text>
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 13,
            color: tokens.inkTertiary,
            textAlign: 'center',
            maxWidth: 320,
            lineHeight: 18,
          }}
        >
          {subheading}
        </Text>
      </View>

      <AuthForm
        onSuccess={onSuccess}
        hideHeader
      />
    </ScrollView>

    {/* Footer — same placement as Back / Next on the other onboarding pages. */}
    <View
      className="flex-row items-center justify-between"
      style={{
        position: 'absolute',
        bottom: 36,
        left: 24,
        right: 24,
        zIndex: 10,
      }}
    >
      <Pressable onPress={onBack} className="px-3 py-2 active:opacity-60">
        <Text style={{ fontFamily: serif, fontSize: 13, color: tokens.inkTertiary }}>
          Back
        </Text>
      </Pressable>
      <Pressable onPress={onSkip} className="px-3 py-2 active:opacity-60">
        <Text
          style={{
            fontFamily: serif,
            fontSize: 13,
            color: tokens.inkTertiary,
            textDecorationLine: 'underline',
          }}
        >
          Skip for now
        </Text>
      </Pressable>
    </View>
    </View>
  );
}

/* -------------------------------- shared bits -------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
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
