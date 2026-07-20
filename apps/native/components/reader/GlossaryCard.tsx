import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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
};

export function GlossaryCard({
  entry,
  onClose,
  onRefreshDefinition,
  onRefreshContext,
  onPronounce,
}: {
  entry: Entry;
  onClose: () => void;
  onRefreshDefinition: () => void;
  onRefreshContext: () => void;
  onPronounce?: () => void;
}) {
  const { tokens, accent } = useSettings();
  const example = entry.example ?? entry.used_in_sentence ?? '';

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={{
        // Solid theme bg so the card stays readable when shown over the
        // dark/blurred popup backdrop. The accent tint sits on top as an
        // overlay layer so the visual feel matches inline expansions.
        backgroundColor: tokens.bg,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: withAlpha(accent, 0.45),
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 14,
      }}
    >
      {/* Subtle accent wash so the card retains its old "highlighted" feel
          without bleeding the dark backdrop through. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: withAlpha(accent, 0.06),
        }}
      />
      {/* Header: term + language tag */}
      <View
        className="flex-row items-center justify-between"
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: withAlpha(accent, 0.08),
        }}
      >
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 18,
            color: accent,
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
              color: accent,
              fontWeight: '600',
            }}
          >
            {entry.lang.toUpperCase()}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close glossary"
            className="h-6 w-6 items-center justify-center rounded-full"
            style={{ borderWidth: 1, borderColor: withAlpha(accent, 0.4) }}
          >
            <Ionicons name="close" size={11} color={accent} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
        {/* PRONOUNCE */}
        {entry.pronunciation ? (
          <View>
            <SectionHeader>Pronounce</SectionHeader>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Text style={{ fontFamily: serif, fontSize: 14, color: tokens.ink }}>
                {entry.pronunciation}
              </Text>
              <SmallIconButton
                icon="volume-high"
                onPress={onPronounce ?? (() => {})}
                disabled={!onPronounce}
                accessibilityLabel="Pronounce"
              />
            </View>
          </View>
        ) : null}

        <Divider />

        {/* DEFINITION */}
        <View>
          <SectionHeader>Definition</SectionHeader>
          <View className="flex-row" style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 14,
                lineHeight: 20,
                color: tokens.ink,
                flex: 1,
              }}
            >
              {entry.definition}
            </Text>
            <SmallIconButton
              icon="refresh"
              onPress={onRefreshDefinition}
              accessibilityLabel="Refresh definition"
            />
          </View>
        </View>

        {example ? (
          <>
            <Divider />
            <View>
              <SectionHeader>In context</SectionHeader>
              <View className="flex-row" style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: serifItalic,
                    fontSize: 14,
                    lineHeight: 20,
                    color: tokens.inkSecondary,
                    flex: 1,
                  }}
                >
                  {example}
                </Text>
                <SmallIconButton
                  icon="refresh"
                  onPress={onRefreshContext}
                  accessibilityLabel="Refresh example"
                />
              </View>
            </View>
          </>
        ) : null}
      </View>
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
  onPress,
  disabled,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
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
        marginTop: 2,
      }}
    >
      <Ionicons name={icon} size={12} color={accent} />
    </Pressable>
  );
}
