import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';

export function AudioSettings() {
  const { tokens, accent } = useSettings();

  return (
    <View
      className="px-6 py-8"
      style={{ alignItems: 'center', gap: 14 }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: 64,
          height: 64,
          backgroundColor: withAlpha(accent, 0.14),
        }}
      >
        <Ionicons name="headset-outline" size={28} color={accent} />
      </View>

      <Text
        style={{
          fontFamily: serif,
          fontSize: 11,
          letterSpacing: 1.4,
          color: accent,
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        Coming soon
      </Text>

      <Text
        style={{
          fontFamily: serif,
          fontSize: 20,
          color: tokens.ink,
          textAlign: 'center',
        }}
      >
        Author narration
      </Text>

      <Text
        style={{
          fontFamily: serifItalic,
          fontSize: 14,
          color: tokens.inkSecondary,
          textAlign: 'center',
          maxWidth: 320,
          lineHeight: 20,
        }}
      >
        Listen to Ethan read the book aloud, with karaoke-style word highlighting that follows along as you read.
      </Text>
    </View>
  );
}
