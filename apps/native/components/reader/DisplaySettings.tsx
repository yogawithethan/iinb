import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { runOnJS } from 'react-native-reanimated';
import { Slider } from 'heroui-native';
import ColorPicker, {
  HueSlider,
  Panel1,
} from 'reanimated-color-picker';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings, isThemePremium } from '@/lib/SettingsContext';
import {
  THEME_CARDS,
  withAlpha,
  type FontFamily,
  type ThemeId,
} from '@/lib/theme';
import { SectionLabel } from './SettingsPrimitives';

const FONT_OPTIONS: { id: FontFamily; label: string }[] = [
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans-serif' },
];

const ACCENT_SWATCHES = [
  '#2563eb',
  '#60a5fa',
  '#b4653a',
  '#9a8fb8',
  '#7a9b76',
  '#c1666b',
  '#d4a574',
  '#5b6c8c',
];

export function DisplaySettings() {
  const { theme, fontFamily, fontSize, accentByTheme, purchased, accent, tokens, update } =
    useSettings();

  const themeAccent = accentByTheme[theme] ?? null;

  const setAccent = (hex: string | null) => {
    update({ accentByTheme: { ...accentByTheme, [theme]: hex } });
  };

  return (
    <View className="px-4 py-4" style={{ gap: 24 }}>
      {/* THEME */}
      <View>
        <SectionLabel>Theme</SectionLabel>
        <View className="flex-row" style={{ gap: 8 }}>
          {THEME_CARDS.map((t) => {
            const selected = theme === t.id;
            const locked = !purchased && isThemePremium(t.id);
            return (
              <Pressable
                key={t.id}
                onPress={() => (locked ? null : update({ theme: t.id as ThemeId }))}
                className="flex-1 items-center rounded-2xl p-2 active:opacity-80"
                style={{
                  borderWidth: 1,
                  borderColor: selected ? accent : tokens.pillBorder,
                  backgroundColor: selected ? withAlpha(accent, 0.1) : 'transparent',
                }}
              >
                <View
                  className="h-10 w-full items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: t.bg,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.06)',
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  <Text style={{ fontFamily: serif, fontSize: 15, color: t.ink }}>Aa</Text>
                </View>
                <Text
                  style={{
                    fontFamily: serif,
                    fontSize: 11,
                    marginTop: 6,
                    color: selected ? accent : tokens.inkSecondary,
                    fontWeight: selected ? '600' : '500',
                    opacity: locked ? 0.65 : 1,
                  }}
                >
                  {t.label}
                </Text>
                {locked ? (
                  <View
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: 6,
                      backgroundColor: withAlpha(accent, 0.18),
                      borderRadius: 999,
                      height: 18,
                      width: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="lock-closed" size={10} color={accent} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* TEXT SIZE */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <SectionLabel>Text size</SectionLabel>
          <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkSecondary }}>
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

      {/* PREVIEW (between text size and width) */}
      <View>
        <SectionLabel>Preview</SectionLabel>
        <View
          className="rounded-2xl p-3"
          style={{
            backgroundColor: withAlpha(accent, 0.12),
            borderWidth: 1,
            borderColor: withAlpha(accent, 0.3),
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily === 'serif' ? serif : 'System',
              fontSize: fontSize,
              lineHeight: fontSize * 1.5,
              color: tokens.ink,
            }}
          >
            Chapter 1: Pleasure
          </Text>
          <Text
            style={{
              fontFamily: serifItalic,
              fontSize: 13,
              color: accent,
              marginTop: 2,
            }}
          >
            Annica
          </Text>
        </View>
      </View>

      {/* FONT */}
      <View>
        <SectionLabel>Font</SectionLabel>
        <View className="flex-row" style={{ gap: 8 }}>
          {FONT_OPTIONS.map((f) => {
            const selected = fontFamily === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => update({ fontFamily: f.id })}
                className="flex-1 items-center rounded-xl px-3 py-2.5 active:opacity-70"
                style={{
                  borderWidth: 1,
                  borderColor: selected ? accent : tokens.pillBorder,
                  backgroundColor: selected ? withAlpha(accent, 0.12) : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: f.id === 'serif' ? serif : 'System',
                    fontSize: 14,
                    fontWeight: selected ? '600' : '500',
                    color: selected ? accent : tokens.inkSecondary,
                  }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ACCENT */}
      <View>
        <View className="flex-row items-center justify-between mb-2">
          <SectionLabel>Accent color</SectionLabel>
          {purchased && themeAccent ? (
            <Pressable onPress={() => setAccent(null)}>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 11,
                  color: tokens.inkTertiary,
                  textDecorationLine: 'underline',
                }}
              >
                Reset
              </Text>
            </Pressable>
          ) : null}
        </View>
        {purchased ? (
          <AccentPicker value={accent} onChange={setAccent} />
        ) : (
          <View
            className="rounded-xl px-3 py-3 flex-row items-center justify-between"
            style={{ backgroundColor: withAlpha(accent, 0.08) }}
          >
            <View className="flex-1 pr-3">
              <Text style={{ fontFamily: serif, fontSize: 14, color: tokens.ink }}>
                Custom accent color
              </Text>
              <Text
                style={{ fontFamily: serif, fontSize: 12, color: tokens.inkTertiary, marginTop: 2 }}
              >
                Tint the app with any color you like.
              </Text>
            </View>
            <View
              className="h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: withAlpha(accent, 0.22) }}
            >
              <Ionicons name="lock-closed" size={12} color={accent} />
            </View>
          </View>
        )}
      </View>


    </View>
  );
}

function AccentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const { tokens } = useSettings();

  const handlePickerChange = useCallback(
    (color: { hex: string }) => {
      'worklet';
      runOnJS(onChange)(color.hex);
    },
    [onChange]
  );

  const randomize = () => {
    const hex =
      '#' +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0');
    onChange(hex);
  };

  return (
    <View
      className="rounded-2xl p-3"
      style={{
        backgroundColor: tokens.bg,
        borderWidth: 1,
        borderColor: tokens.pillBorder,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      {/* Swatches row at top */}
      <View className="flex-row items-center justify-between mb-3" style={{ gap: 6 }}>
        {ACCENT_SWATCHES.map((hex) => {
          const selected = value.toLowerCase() === hex.toLowerCase();
          return (
            <Pressable
              key={hex}
              onPress={() => onChange(hex)}
              style={{
                height: 18,
                width: 18,
                borderRadius: 999,
                backgroundColor: hex,
                borderWidth: selected ? 2 : 0,
                borderColor: tokens.ink,
              }}
            />
          );
        })}
      </View>

      <ColorPicker
        value={value}
        sliderThickness={18}
        thumbSize={20}
        thumbShape="ring"
        onChange={handlePickerChange}
        boundedThumb
      >
        <Panel1 style={{ borderRadius: 14, height: 180 }} />
        <View className="flex-row items-center mt-3" style={{ gap: 8 }}>
          <View className="flex-1">
            <HueSlider style={{ borderRadius: 999 }} />
          </View>
          <Pressable
            onPress={randomize}
            className="h-7 w-7 items-center justify-center rounded-full"
            style={{
              borderWidth: 1,
              borderColor: tokens.pillBorder,
              backgroundColor: tokens.bgSoft,
            }}
          >
            <Ionicons name="shuffle" size={12} color={tokens.ink} />
          </Pressable>
        </View>
      </ColorPicker>

      {/* Hex display */}
      <View
        className="flex-row items-center mt-3 px-3 py-2 rounded-xl"
        style={{ backgroundColor: tokens.bgSoft, gap: 10 }}
      >
        <View
          style={{
            height: 14,
            width: 14,
            borderRadius: 999,
            backgroundColor: value,
          }}
        />
        <Text style={{ fontFamily: 'System', fontSize: 13, color: tokens.inkSecondary }}>
          # {value.replace('#', '').toUpperCase()}
        </Text>
      </View>
    </View>
  );
}
