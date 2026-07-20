import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { serif, serifItalic } from '@/lib/fonts';
import { useAuth } from '@/lib/AuthContext';
import { useSettings } from '@/lib/SettingsContext';

export function AuthForm({
  onSuccess,
  hideHeader,
}: {
  onSuccess?: () => void;
  hideHeader?: boolean;
  hideModeToggle?: boolean;
  mode?: 'sign-in' | 'sign-up';
  onModeChange?: (mode: 'sign-in' | 'sign-up') => void;
}) {
  const { requestSignInLink, user } = useAuth();
  const { tokens, accent } = useSettings();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user) onSuccess?.();
  }, [user, onSuccess]);

  const submit = async () => {
    setError(null);
    setInfo(null);
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Enter a valid email.');
      return;
    }
    setBusy(true);
    const result = await requestSignInLink(normalized);
    setBusy(false);
    if (result.error) setError(result.error);
    else setInfo('Check your email and tap the secure link to return to IINB. It works for 30 minutes.');
  };

  return (
    <View
      style={{
        backgroundColor: tokens.bgSoft,
        borderWidth: 1,
        borderColor: tokens.pillBorder,
        borderRadius: 24,
        padding: 18,
        gap: 14,
        marginTop: 10,
      }}
    >
      {!hideHeader ? (
        <View className="items-center" style={{ gap: 4 }}>
          <Text style={{ fontFamily: serif, fontSize: 22, color: tokens.ink }}>
            Yoga With Ethan account
          </Text>
          <Text
            style={{
              fontFamily: serifItalic,
              fontSize: 12,
              color: tokens.inkTertiary,
              textAlign: 'center',
            }}
          >
            One secure sign-in across IINB and the wider ecosystem.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(180,40,40,0.08)' }}>
          <Text style={{ fontFamily: serif, fontSize: 13, color: '#a02020' }}>{error}</Text>
        </View>
      ) : null}
      {info ? (
        <View className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(40,140,80,0.08)' }}>
          <Text style={{ fontFamily: serif, fontSize: 13, color: '#246244', lineHeight: 18 }}>{info}</Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={tokens.inkTertiary}
            onSubmitEditing={() => { void submit(); }}
            style={fieldStyle(tokens)}
          />
        </View>

        <Pressable
          onPress={() => { void submit(); }}
          disabled={busy}
          className="flex-row items-center justify-center rounded-full px-4 py-3.5 active:opacity-80"
          style={{ backgroundColor: accent, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ fontFamily: serif, fontSize: 15, fontWeight: '600', color: '#ffffff' }}>
              Email me a secure sign-in link
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function fieldStyle(tokens: ReturnType<typeof useSettings>['tokens']) {
  return {
    fontFamily: serif,
    fontSize: 16,
    color: tokens.ink,
    borderWidth: 1,
    borderColor: tokens.pillBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.bg,
  } as const;
}
