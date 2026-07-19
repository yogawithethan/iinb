import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Share, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useAuth } from '@/lib/AuthContext';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import { SectionLabel } from './SettingsPrimitives';
import { AuthForm } from './AuthForm';
import { MoreFromEthan } from '@/components/MoreFromEthan';
import { PRODUCT_GIFT_CODE, isIapAvailable, purchaseProduct } from '@/lib/iap';

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] ?? '';
  return handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Islander';
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase() || '·';
}

export function ProfileSettings({
  authOpenTrigger = 0,
  redeemOpenTrigger = 0,
}: {
  authOpenTrigger?: number;
  redeemOpenTrigger?: number;
}) {
  const { user, signOut, refreshEntitlements } = useAuth();
  const { tokens, accent, purchased, update } = useSettings();
  const [authOpen, setAuthOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  // Initialize from the trigger so a fresh-mount triggered open expands on
  // the first render (the useEffect below handles subsequent triggers).
  const [redeemOpen, setRedeemOpen] = useState(redeemOpenTrigger > 0);
  const [giftEmail, setGiftEmail] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSubmitting, setGiftSubmitting] = useState(false);
  /** Set when an iOS IAP gift purchase succeeds and a license code is issued.
   *  Surfaces an inline "share this code" view; clearing it returns the form. */
  const [giftCode, setGiftCode] = useState<string | null>(null);
  const useGiftIap = isIapAvailable();

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSubmitting, setRedeemSubmitting] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const submitRedeem = async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setRedeemError(null);
    setRedeemSubmitting(true);
    const { redeemLicense } = await import('@/lib/license');
    const result = await redeemLicense(redeemCode);
    setRedeemSubmitting(false);
    if (result.kind === 'ok') {
      setRedeemSuccess(true);
      await refreshEntitlements();
      setTimeout(() => {
        setRedeemSuccess(false);
        setRedeemCode('');
        setRedeemOpen(false);
      }, 1400);
      return;
    }
    if (result.kind === 'sign_in_required') {
      setAuthOpen(true);
      return;
    }
    setRedeemError(result.message);
  };

  const submitGift = async () => {
    setGiftError(null);

    // iOS path — App Store IAP. The recipient email/note aren't sent to Apple
    // (StoreKit doesn't carry per-purchase metadata); the buyer gets a
    // license code to share. Email/note are kept on-screen so the buyer can
    // hand the code off in their own message.
    if (useGiftIap) {
      if (giftSubmitting) return;
      setGiftSubmitting(true);
      const result = await purchaseProduct(PRODUCT_GIFT_CODE);
      setGiftSubmitting(false);
      if (result.kind === 'ok' && result.giftCode) {
        setGiftCode(result.giftCode);
        return;
      }
      if (result.kind === 'sign_in_required') {
        setAuthOpen(true);
        return;
      }
      if (result.kind === 'error' && result.message !== 'cancelled') {
        setGiftError(result.message);
      }
      return;
    }

    setGiftError('Gift codes are currently available through the iOS app. Web gifting will return through Yoga With Ethan checkout.');
  };

  const shareGiftCode = async (code: string) => {
    const recipient = giftEmail.trim();
    const note = giftNote.trim();
    const lines = [
      recipient ? `For ${recipient}:` : '',
      note,
      note ? '' : '',
      `Here's your copy of "Ignorance Is Not Bliss" by Ethan Hill.`,
      ``,
      `Redemption code: ${code}`,
      ``,
      `Open the app, tap Profile → Redeem a code, and paste it in.`,
    ].filter(Boolean);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (err) {
      Alert.alert('Could not open share sheet', (err as Error)?.message ?? '');
    }
  };
  // Trigger pattern: parent bumps the value to expand a section without us
  // having to share state across navigation.
  const seenTrigger = useRef(authOpenTrigger);
  const seenRedeemTrigger = useRef(redeemOpenTrigger);
  useEffect(() => {
    if (redeemOpenTrigger !== seenRedeemTrigger.current) {
      seenRedeemTrigger.current = redeemOpenTrigger;
      setRedeemOpen(true);
    }
  }, [redeemOpenTrigger]);
  useEffect(() => {
    if (authOpenTrigger !== seenTrigger.current) {
      seenTrigger.current = authOpenTrigger;
      if (!user) setAuthOpen(true);
    }
  }, [authOpenTrigger, user]);

  const isAuthed = Boolean(user);
  const email = user?.email ?? '';
  const name = email ? nameFromEmail(email) : 'Islander';

  const handleSignOut = async () => {
    if (user) await signOut();
  };

  return (
    <View className="px-4 py-4" style={{ gap: 12 }}>
      <View>
        <SectionLabel>Account</SectionLabel>

        {isAuthed ? (
          <>
            <View
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: tokens.bgSoft }}
            >
              <View className="flex-row items-center" style={{ gap: 12 }}>
                {/* Avatar placeholder */}
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: withAlpha(accent, 0.18),
                    borderWidth: 1,
                    borderColor: withAlpha(accent, 0.3),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: 16,
                      fontWeight: '600',
                      color: accent,
                    }}
                  >
                    {initials(name)}
                  </Text>
                </View>

                <View className="flex-1">
                  <Text
                    style={{ fontFamily: serif, fontSize: 16, color: tokens.ink }}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  {email ? (
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 12,
                        color: tokens.inkTertiary,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {email}
                    </Text>
                  ) : null}
                </View>

                {purchased ? (
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor: withAlpha(accent, 0.15),
                      borderWidth: 1,
                      borderColor: withAlpha(accent, 0.35),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 10,
                        letterSpacing: 0.6,
                        color: accent,
                        fontWeight: '600',
                      }}
                    >
                      PREMIUM
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Centered sign out button, outside the card */}
            <View className="items-center" style={{ marginTop: 14 }}>
              <Pressable
                onPress={handleSignOut}
                className="flex-row items-center rounded-full px-4 py-2 active:opacity-70"
                style={{ borderWidth: 1, borderColor: tokens.pillBorder, gap: 6 }}
              >
                <Ionicons name="log-out-outline" size={14} color={tokens.inkSecondary} />
                <Text style={{ fontFamily: serif, fontSize: 13, color: tokens.inkSecondary }}>
                  Logout
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ gap: 12 }}>
            {/* Single expanding card — header row collapses/expands the
                AuthForm inside it, like the Redeem and Gift cards. */}
            <Animated.View
              layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}
              style={{
                borderWidth: 1,
                borderColor: tokens.pillBorder,
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              <Pressable
                onPress={() => setAuthOpen((v) => !v)}
                className="flex-row items-center justify-between px-4 py-4 active:opacity-70"
              >
                <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>
                  Sign in
                </Text>
                <Ionicons
                  name={authOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={tokens.inkTertiary}
                />
              </Pressable>

              {authOpen ? (
                <Animated.View
                  entering={FadeIn.duration(180).easing(Easing.out(Easing.quad))}
                  exiting={FadeOut.duration(140)}
                  style={{ paddingHorizontal: 14, paddingBottom: 14 }}
                >
                  <AuthForm onSuccess={() => setAuthOpen(false)} />
                </Animated.View>
              ) : null}
            </Animated.View>

          </View>
        )}
      </View>

      <View>
        <SectionLabel>Reader setup</SectionLabel>

        <Pressable
          onPress={() => update({ firstLaunched: false })}
          className="flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-70"
          style={{
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            marginTop: 8,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>
              Replay first-launch onboarding
            </Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              Return to the introduction and reader preferences.
            </Text>
          </View>
          <Ionicons name="play-outline" size={16} color={tokens.inkSecondary} />
        </Pressable>

        {purchased ? <Pressable
          onPress={() => update({ onboarded: false })}
          className="flex-row items-center justify-between rounded-2xl px-4 py-3 active:opacity-70"
          style={{
            borderWidth: 1,
            borderColor: tokens.pillBorder,
            marginTop: 8,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>
              Replay post-purchase onboarding
            </Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              Revisit the complete-reader walkthrough.
            </Text>
          </View>
          <Ionicons name="play-outline" size={16} color={tokens.inkSecondary} />
        </Pressable> : null}
      </View>

      {/* StoreKit owns digital gift purchases on iOS. The old Polar runtime
          path has been retired; non-iOS gifting stays visibly unavailable
          until the canonical YWE Stripe gift flow is ready. */}
      <Animated.View
        layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}
        style={{
          borderWidth: 1,
          borderColor: tokens.pillBorder,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => setGiftOpen((v) => !v)}
          className="flex-row items-center px-4 py-3 active:opacity-70"
          style={{ gap: 12 }}
        >
          <View
            className="items-center justify-center rounded-full"
            style={{
              height: 36,
              width: 36,
              backgroundColor: withAlpha(accent, 0.18),
            }}
          >
            <Ionicons name="gift-outline" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>
              Gift the book to a friend
            </Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              {useGiftIap
                ? "Buy a code you can share with anyone — they redeem it in the app."
                : "Gift codes are currently available in the iOS app."}
            </Text>
          </View>
          <Ionicons
            name={giftOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={tokens.inkTertiary}
          />
        </Pressable>

        {giftOpen && giftCode ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
          >
            <Text
              style={{
                fontFamily: serifItalic,
                fontSize: 13,
                color: tokens.inkSecondary,
                lineHeight: 18,
              }}
            >
              Done — here’s the code. Share it with your friend any way you like; they’ll redeem it under Profile → Redeem a code.
            </Text>
            <View
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: withAlpha(accent, 0.45),
                backgroundColor: withAlpha(accent, 0.08),
                alignItems: 'center',
              }}
            >
              <Text
                selectable
                style={{
                  fontFamily: 'Menlo',
                  fontSize: 16,
                  color: tokens.ink,
                  letterSpacing: 1,
                }}
              >
                {giftCode}
              </Text>
            </View>
            <Pressable
              onPress={() => shareGiftCode(giftCode)}
              className="active:opacity-80"
              style={{
                alignItems: 'center',
                paddingVertical: 13,
                borderRadius: 999,
                backgroundColor: accent,
              }}
            >
              <Text style={{ fontFamily: serif, fontSize: 14, fontWeight: '600', color: '#fff' }}>
                Share code
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setGiftCode(null);
                setGiftEmail('');
                setGiftNote('');
              }}
              className="active:opacity-70"
              style={{ alignItems: 'center', paddingVertical: 6 }}
            >
              <Text style={{ fontFamily: serif, fontSize: 12, color: tokens.inkTertiary }}>
                Gift another copy
              </Text>
            </Pressable>
          </Animated.View>
        ) : giftOpen ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
          >
            <Text
              style={{
                fontFamily: serifItalic,
                fontSize: 12,
                color: tokens.inkSecondary,
                lineHeight: 17,
              }}
            >
              {useGiftIap
                ? "After purchase, you'll get a code to share with your friend. The email and note below are just to help you remember who it's for."
                : "The former Polar gift checkout has been retired while gifting moves into Yoga With Ethan."}
            </Text>

            <View>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 11,
                  color: tokens.inkSecondary,
                  marginBottom: 5,
                }}
              >
                Their email
              </Text>
              <TextInput
                value={giftEmail}
                onChangeText={(v) => {
                  setGiftEmail(v);
                  setGiftError(null);
                }}
                placeholder="friend@example.com"
                placeholderTextColor={tokens.inkTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={{
                  fontFamily: serif,
                  fontSize: 14,
                  color: tokens.ink,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: giftError ? '#c44' : tokens.pillBorder,
                  backgroundColor: tokens.bg,
                }}
              />
            </View>

            <View>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 11,
                  color: tokens.inkSecondary,
                  marginBottom: 5,
                }}
              >
                Note (optional)
              </Text>
              <TextInput
                value={giftNote}
                onChangeText={setGiftNote}
                placeholder="A quick line from you"
                placeholderTextColor={tokens.inkTertiary}
                multiline
                numberOfLines={3}
                maxLength={300}
                style={{
                  fontFamily: serif,
                  fontSize: 14,
                  color: tokens.ink,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  minHeight: 70,
                  textAlignVertical: 'top',
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: tokens.pillBorder,
                  backgroundColor: tokens.bg,
                }}
              />
            </View>

            {giftError ? (
              <Text style={{ fontFamily: serif, fontSize: 12, color: '#c44' }}>
                {giftError}
              </Text>
            ) : null}

            <Pressable
              onPress={submitGift}
              disabled={!useGiftIap || giftSubmitting}
              className="active:opacity-80"
              style={{
                marginTop: 4,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 13,
                borderRadius: 999,
                backgroundColor: accent,
                opacity: !useGiftIap || giftSubmitting ? 0.45 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#ffffff',
                }}
              >
                {giftSubmitting
                  ? 'Purchasing…'
                  : useGiftIap
                    ? 'Buy gift code'
                    : 'Available on iOS'}
              </Text>
            </Pressable>

            <Text
              style={{
                fontFamily: serifItalic,
                fontSize: 10,
                color: tokens.inkTertiary,
                textAlign: 'center',
              }}
            >
              One-time payment. No subscription.
            </Text>
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Redeem a code — inline expandable, parallel to the Gift card. */}
      <Animated.View
        layout={LinearTransition.duration(220).easing(Easing.out(Easing.cubic))}
        style={{
          borderWidth: 1,
          borderColor: tokens.pillBorder,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <Pressable
          onPress={() => setRedeemOpen((v) => !v)}
          className="flex-row items-center px-4 py-3 active:opacity-70"
          style={{ gap: 12 }}
        >
          <View
            className="items-center justify-center rounded-full"
            style={{
              height: 36,
              width: 36,
              backgroundColor: withAlpha(accent, 0.12),
            }}
          >
            <Ionicons name="key-outline" size={16} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: serif, fontSize: 15, color: tokens.ink }}>
              Redeem a code
            </Text>
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              Restore on a new device, or claim a gift.
            </Text>
          </View>
          <Ionicons
            name={redeemOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={tokens.inkTertiary}
          />
        </Pressable>

        {redeemOpen ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(140)}
            style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}
          >
            <Text
              style={{
                fontFamily: serifItalic,
                fontSize: 12,
                color: tokens.inkSecondary,
                lineHeight: 17,
              }}
            >
              Paste the IINB code from your purchase email or gift. We’ll handle the dashes.
            </Text>

            <TextInput
              value={redeemCode}
              onChangeText={(v) => {
                setRedeemCode(v);
                setRedeemError(null);
              }}
              placeholder="IINB-XXXX-XXXX-XXXX"
              placeholderTextColor={tokens.inkTertiary}
              autoCapitalize="characters"
              autoCorrect={false}
              spellCheck={false}
              editable={!redeemSubmitting && !redeemSuccess}
              style={{
                fontFamily: serif,
                fontSize: 15,
                letterSpacing: 1,
                color: tokens.ink,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: redeemError ? '#c44' : tokens.pillBorder,
                backgroundColor: tokens.bg,
              }}
            />

            {redeemError ? (
              <Text style={{ fontFamily: serif, fontSize: 12, color: '#c44', lineHeight: 16 }}>
                {redeemError}
              </Text>
            ) : null}

            <Pressable
              onPress={submitRedeem}
              disabled={redeemSubmitting || redeemSuccess || !redeemCode}
              className="active:opacity-80"
              style={{
                marginTop: 4,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 13,
                borderRadius: 999,
                backgroundColor: redeemSuccess ? '#3a8a52' : accent,
                opacity: !redeemCode ? 0.45 : 1,
              }}
            >
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#ffffff',
                }}
              >
                {redeemSuccess
                  ? 'Redeemed ✓'
                  : redeemSubmitting
                  ? 'Redeeming…'
                  : 'Redeem'}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </Animated.View>

      {/* Cross-app links — reusable component, drop it into any of Ethan's apps. */}
      <MoreFromEthan />
    </View>
  );
}
