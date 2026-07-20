import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Switch } from 'heroui-native';
import { Ionicons } from '@expo/vector-icons';

import { serif } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';

export function SectionLabel({ children }: { children: ReactNode }) {
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

export function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { tokens } = useSettings();
  return (
    <View
      className="flex-row items-center justify-between gap-3 py-2"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View className="flex-1">
        <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>{label}</Text>
        {description ? (
          <Text
            style={{
              fontFamily: serif,
              fontSize: 12,
              color: tokens.inkTertiary,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Switch isSelected={value} onSelectedChange={onChange} isDisabled={disabled} />
    </View>
  );
}

export function LockedRow({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  const { tokens, accent } = useSettings();
  return (
    <View className="flex-row items-center justify-between gap-3 py-2 opacity-70">
      <View className="flex-1">
        <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>{label}</Text>
        {description ? (
          <Text
            style={{
              fontFamily: serif,
              fontSize: 12,
              color: tokens.inkTertiary,
              marginTop: 2,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{ backgroundColor: withAlpha(accent, 0.18) }}
      >
        <Ionicons name="lock-closed" size={12} color={accent} />
      </View>
    </View>
  );
}

export function PillGroup<T extends string | number | null>({
  value,
  onChange,
  options,
  columns,
  wrap,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  columns?: number;
  /** Let pills size to their content (used when labels vary in length). */
  wrap?: boolean;
}) {
  const { tokens, accent } = useSettings();
  const cols = columns ?? options.length;
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            className="rounded-xl px-3 py-2 active:opacity-70"
            style={
              wrap
                ? {
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: selected ? accent : tokens.pillBorder,
                    backgroundColor: selected ? withAlpha(accent, 0.12) : 'transparent',
                  }
                : {
                    flexBasis: `${100 / cols}%`,
                    flexGrow: 1,
                    maxWidth: `${100 / cols - 2}%`,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: selected ? accent : tokens.pillBorder,
                    backgroundColor: selected ? withAlpha(accent, 0.12) : 'transparent',
                  }
            }
          >
            <Text
              style={{
                fontFamily: serif,
                fontSize: 13,
                fontWeight: selected ? '600' : '500',
                color: selected ? accent : tokens.inkSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
