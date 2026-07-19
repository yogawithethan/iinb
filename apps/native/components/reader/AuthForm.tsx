import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { serif, serifItalic } from '@/lib/fonts';
import { useAuth } from '@/lib/AuthContext';
import { useSettings } from '@/lib/SettingsContext';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm({
  onSuccess,
  hideHeader,
  hideModeToggle,
  mode: controlledMode,
  onModeChange,
}: {
  onSuccess?: () => void;
  hideHeader?: boolean;
  hideModeToggle?: boolean;
  mode?: 'sign-in' | 'sign-up';
  onModeChange?: (m: 'sign-in' | 'sign-up') => void;
}) {
  const { signIn, signUp, resetPassword } = useAuth();
  const { tokens, accent } = useSettings();
  const [internalMode, setInternalMode] = useState<Mode>('sign-in');
  const mode = controlledMode ?? internalMode;
  const setMode = (m: Mode) => {
    if (onModeChange) onModeChange(m);
    else setInternalMode(m);
  };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError('Email and password required.');
      return;
    }
    setBusy(true);
    if (mode === 'sign-in') {
      const { error: err } = await signIn(email.trim(), password);
      setBusy(false);
      if (err) setError(err);
      else onSuccess?.();
    } else {
      const { error: err, alreadyRegistered, needsConfirmation } = await signUp(
        email.trim(),
        password,
      );
      setBusy(false);
      if (alreadyRegistered) {
        // Don't dead-end the user — flip to sign-in, keep their email, drop
        // the password (they may have used a different one), nudge gently.
        setMode('sign-in');
        setPassword('');
        setError(null);
        setInfo(
          'Looks like you already have an Islands account. Sign in below — or use Forgot password if you need it reset.',
        );
        return;
      }
      if (err) {
        setError(err);
        return;
      }
      if (needsConfirmation) {
        setInfo('Check your inbox for a confirmation link, then sign in.');
        setMode('sign-in');
        setPassword('');
      } else {
        onSuccess?.();
      }
    }
  };

  const handleForgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password again.');
      return;
    }
    setBusy(true);
    const { error: err } = await resetPassword(email.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo("If that email has an Islands account, we've sent a reset link.");
  };

  return (
    <View
      style={{
        backgroundColor: tokens.bg,
        borderWidth: 1,
        borderColor: tokens.pillBorder,
        borderRadius: 20,
        padding: 18,
        gap: 14,
        marginTop: 10,
      }}
    >
      {!hideHeader ? (
        <View className="items-center" style={{ gap: 4 }}>
          <Text style={{ fontFamily: serif, fontSize: 22, color: tokens.ink }}>
            {mode === 'sign-in' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text
            style={{
              fontFamily: serifItalic,
              fontSize: 12,
              color: tokens.inkTertiary,
              textAlign: 'center',
            }}
          >
            One Islands account across all of Ethan's apps.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View
          className="rounded-xl px-3 py-2"
          style={{ backgroundColor: 'rgba(180,40,40,0.08)' }}
        >
          <Text style={{ fontFamily: serif, fontSize: 13, color: '#a02020' }}>{error}</Text>
        </View>
      ) : null}
      {info ? (
        <View
          className="rounded-xl px-3 py-2"
          style={{ backgroundColor: 'rgba(40,140,80,0.08)' }}
        >
          <Text style={{ fontFamily: serif, fontSize: 13, color: '#246244' }}>{info}</Text>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={tokens.inkTertiary}
            style={fieldStyle(tokens)}
          />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: serif, fontSize: 11, color: tokens.inkTertiary }}>
            Password
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={tokens.inkTertiary}
            style={fieldStyle(tokens)}
          />
          {mode === 'sign-in' ? (
            <Pressable
              onPress={handleForgot}
              hitSlop={6}
              style={{ alignSelf: 'flex-end', paddingTop: 4 }}
            >
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 12,
                  color: tokens.inkTertiary,
                  textDecorationLine: 'underline',
                }}
              >
                Forgot password?
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={submit}
          disabled={busy}
          className="flex-row items-center justify-center rounded-full px-4 py-3.5 active:opacity-80"
          style={{ backgroundColor: accent, opacity: busy ? 0.7 : 1 }}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text
              style={{
                fontFamily: serif,
                fontSize: 15,
                fontWeight: '600',
                color: '#ffffff',
              }}
            >
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        {!hideModeToggle ? (
          <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                textAlign: 'center',
              }}
            >
              {mode === 'sign-in'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        ) : null}
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.bg,
  } as const;
}
