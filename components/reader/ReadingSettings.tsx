import { Pressable, Text, View } from 'react-native';
import { Slider } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';

import { serif } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import { LockedRow, PillGroup, SectionLabel, ToggleRow } from './SettingsPrimitives';

export function ReadingSettings({ onStartRsvp }: { onStartRsvp: () => void }) {
  const { scrollMode, bionicReading, rsvpWpm, purchased, accent, tokens, update } = useSettings();

  return (
    <View className="px-4 py-4" style={{ gap: 24 }}>
      <View>
        <SectionLabel>Flow</SectionLabel>
        <PillGroup
          value={scrollMode}
          onChange={(v) => update({ scrollMode: v })}
          options={[
            { value: 'scroll', label: 'Scroll' },
            { value: 'page-turn', label: 'Page-turn (soon)' },
          ]}
        />
      </View>

      <View>
        <SectionLabel>Accessibility</SectionLabel>
        <ToggleRow
          label="Bionic reading"
          description="Bold the first few letters of each word to create fixation points."
          value={bionicReading}
          onChange={(v) => update({ bionicReading: v })}
        />
      </View>

      <View>
        <SectionLabel>RSVP — Rapid serial presentation</SectionLabel>
        {purchased ? (
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkSecondary,
                lineHeight: 17,
              }}
            >
              Read one word at a time, centered on screen. Tap Begin, then tap any paragraph
              in the book to start streaming from there.
            </Text>

            {/* Speed slider */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ fontFamily: serif, fontSize: 12, color: tokens.inkSecondary }}>
                  Speed
                </Text>
                <Text style={{ fontFamily: serif, fontSize: 12, color: tokens.inkSecondary }}>
                  {rsvpWpm} wpm
                </Text>
              </View>
              <Slider
                minValue={200}
                maxValue={800}
                step={25}
                value={rsvpWpm}
                onChange={(v) => update({ rsvpWpm: Array.isArray(v) ? v[0] : v })}
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

            {/* Begin button */}
            <Pressable
              onPress={onStartRsvp}
              className="flex-row items-center justify-center rounded-2xl px-4 py-3 active:opacity-80"
              style={{ backgroundColor: accent, gap: 8 }}
            >
              <Ionicons name="play" size={16} color="#ffffff" />
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#ffffff',
                }}
              >
                Begin RSVP
              </Text>
            </Pressable>
          </View>
        ) : (
          <LockedRow
            label="Rapid serial presentation"
            description="One word at a time, centered on screen."
          />
        )}
      </View>
    </View>
  );
}
