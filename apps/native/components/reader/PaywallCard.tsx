import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import { useAuth } from '@/lib/AuthContext';
import {
  PRODUCT_FULL_BOOK,
  getProducts,
  isIapAvailable,
  purchaseProduct,
} from '@/lib/iap';
import { yweFetch } from '@/lib/ywe';

export const PRICE_LABEL = '$14.99';

export async function openCheckout(): Promise<{ kind: 'ok' | 'sign_in_required' | 'error'; message?: string }> {
  try {
    const response = await yweFetch('/iinb/checkout', {
      method: 'POST',
      body: JSON.stringify({ requestKey: `native-${Date.now()}-${Math.random().toString(36).slice(2)}` }),
    });
    if (response.status === 401) return { kind: 'sign_in_required' };
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) return { kind: 'error', message: String(data.error || 'Checkout is unavailable.') };
    await Linking.openURL(String(data.url));
    return { kind: 'ok' };
  } catch (error) {
    return { kind: 'error', message: (error as Error)?.message || 'Checkout is unavailable.' };
  }
}

export const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] = [
  {
    icon: 'play',
    title: 'Listen',
    desc: 'Author narration with word-by-word, karaoke highlighting that follows along.',
  },
  {
    icon: 'eye',
    title: 'Absorb',
    desc: 'Speed reading modes that help you understand more, faster.',
  },
  {
    icon: 'sparkles',
    title: 'Ask',
    desc: "Ask questions about what you're reading and get answers from the book.",
  },
  {
    icon: 'refresh',
    title: 'Refresh',
    desc: 'Tap the refresh icon to get examples rewritten for your world.',
  },
];

export function PaywallCard({
  isAuthed,
  onClose,
  onSignIn,
  onAlreadyPurchased,
}: {
  isAuthed: boolean;
  onClose: () => void;
  onSignIn: () => void;
  onAlreadyPurchased?: () => void;
}) {
  const { tokens, accent } = useSettings();
  const { refreshEntitlements } = useAuth();
  const useIap = isIapAvailable();
  const [iapPriceLabel, setIapPriceLabel] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  // On iOS, fetch the App Store-localized price so the CTA shows the user's
  // currency. Falls back to the static PRICE_LABEL until it loads.
  useEffect(() => {
    if (!useIap) return;
    let cancelled = false;
    (async () => {
      try {
        const products = await getProducts();
        const book = products.find((p) => p.id === PRODUCT_FULL_BOOK);
        if (!cancelled && book?.displayPrice) setIapPriceLabel(book.displayPrice);
      } catch (err) {
        console.warn('[PaywallCard] getProducts failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useIap]);

  // Auth-aware CTA: signed-out readers get the shared account link; signed-in
  // readers use StoreKit on iOS and canonical YWE Stripe checkout elsewhere.
  const ctaLabel = !isAuthed
    ? 'Log In'
    : purchasing
      ? 'Purchasing…'
      : (useIap ? (iapPriceLabel ?? PRICE_LABEL) : PRICE_LABEL);
  const handleCta = async () => {
    if (!isAuthed) {
      onSignIn();
      return;
    }
    if (!useIap) {
      setPurchasing(true);
      const result = await openCheckout();
      setPurchasing(false);
      if (result.kind === 'sign_in_required') onSignIn();
      if (result.kind === 'error') Alert.alert('Checkout unavailable', result.message);
      return;
    }
    if (purchasing) return;
    setPurchasing(true);
    const result = await purchaseProduct(PRODUCT_FULL_BOOK);
    setPurchasing(false);
    if (result.kind === 'ok' && result.entitled) {
      await refreshEntitlements();
      onClose();
      return;
    }
    if (result.kind === 'sign_in_required') {
      onSignIn();
      return;
    }
    if (result.kind === 'error' && result.message !== 'cancelled') {
      Alert.alert('Purchase failed', result.message);
    }
  };

  return (
    <Animated.View
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: tokens.bg,
        borderWidth: 1,
        borderColor: withAlpha(accent, 0.4),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between"
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderColor: tokens.pillBorder,
        }}
      >
        <View>
          <Text style={{ fontFamily: serif, fontSize: 16, fontWeight: '600', color: tokens.ink }}>
            Ignorance Is Not Bliss
          </Text>
          <Text
            style={{
              fontFamily: serifItalic,
              fontSize: 13,
              color: tokens.inkSecondary,
              marginTop: 2,
            }}
          >
            Ethan Hill
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
        >
          <Ionicons name="close" size={14} color={tokens.ink} />
        </Pressable>
      </View>

      {/* Features */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
        {FEATURES.map((f) => (
          <View key={f.title} className="flex-row" style={{ gap: 12 }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                height: 32,
                width: 32,
                backgroundColor: withAlpha(accent, 0.18),
                marginTop: 1,
              }}
            >
              <Ionicons name={f.icon} size={14} color={accent} />
            </View>
            <View className="flex-1">
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 14,
                  fontWeight: '600',
                  color: tokens.ink,
                }}
              >
                {f.title}
              </Text>
              <Text
                style={{
                  fontFamily: serif,
                  fontSize: 12,
                  color: tokens.inkSecondary,
                  marginTop: 2,
                  lineHeight: 16,
                }}
              >
                {f.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
        <Pressable
          onPress={handleCta}
          className="flex-row items-center justify-center rounded-full active:opacity-80"
          style={{
            backgroundColor: accent,
            paddingVertical: 14,
            gap: 8,
          }}
        >
          <Text
            style={{
              fontFamily: serif,
              fontSize: 16,
              fontWeight: '600',
              color: '#ffffff',
            }}
          >
            {ctaLabel}
          </Text>
        </Pressable>
        {isAuthed ? (
          <Pressable onPress={onAlreadyPurchased ?? onSignIn} className="items-center">
            <Text
              style={{
                fontFamily: serif,
                fontSize: 12,
                color: tokens.inkTertiary,
                textDecorationLine: 'underline',
              }}
            >
              Already purchased?
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
