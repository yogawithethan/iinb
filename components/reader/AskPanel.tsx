import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import { askTheBook, type ChatTurn } from '@/lib/ai';

type Turn =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; streaming?: boolean };

const SUGGESTIONS = [
  "What's the book's main argument?",
  'How does the author define dukkha?',
  "Where does Ethan talk about the ego's tactics?",
];

type Props = {
  isAuthed: boolean;
  purchased: boolean;
  onClose: () => void;
  onPurchaseRequired: () => void;
  onSignInRequired: () => void;
};

export function AskPanel({
  isAuthed,
  purchased,
  onClose,
  onPurchaseRequired,
  onSignInRequired,
}: Props) {
  const { tokens, accent } = useSettings();

  // Locked states — show a friendly explanation card with the right CTA
  // instead of dropping the user straight into the auth or paywall flow.
  if (!purchased) {
    const needsSignIn = !isAuthed;
    return (
      <LockedCard
        accent={accent}
        ink={tokens.ink}
        inkSecondary={tokens.inkSecondary}
        inkTertiary={tokens.inkTertiary}
        bgSoft={tokens.bgSoft}
        pillBorder={tokens.pillBorder}
        title="Ask the book"
        description={
          needsSignIn
            ? 'Sign in to unlock the AI companion. Ask anything about the book and get answers in the author’s voice, drawn from the actual text.'
            : 'The AI companion comes with the full book. Get it once and ask anything — answers come grounded in the actual text.'
        }
        ctaLabel={needsSignIn ? 'Sign in' : 'Buy · $22'}
        ctaIcon={needsSignIn ? 'arrow-forward' : undefined}
        onCta={needsSignIn ? onSignInRequired : onPurchaseRequired}
        onClose={onClose}
      />
    );
  }

  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = async (qRaw: string) => {
    const q = qRaw.trim();
    if (!q || busy) return;
    setInput('');

    // Stable index for the assistant turn we're about to stream into.
    let assistantIdx = -1;
    setTurns((prev) => {
      assistantIdx = prev.length + 1;
      return [
        ...prev,
        { role: 'user', content: q },
        { role: 'assistant', content: '', streaming: true },
      ];
    });

    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

    setBusy(true);
    const ctl = new AbortController();
    abortRef.current = ctl;

    const history: ChatTurn[] = turns
      .filter((t) => t.role === 'user' || (t.role === 'assistant' && !t.streaming))
      .map((t) => ({ role: t.role, content: t.content }));

    const outcome = await askTheBook(
      q,
      history,
      {
        onToken: (text) => {
          setTurns((prev) => {
            const next = prev.slice();
            const cur = next[assistantIdx];
            if (cur && cur.role === 'assistant') {
              next[assistantIdx] = { ...cur, content: cur.content + text };
            }
            return next;
          });
        },
        onDone: () => {
          setTurns((prev) => {
            const next = prev.slice();
            const cur = next[assistantIdx];
            if (cur && cur.role === 'assistant') {
              next[assistantIdx] = { ...cur, streaming: false };
            }
            return next;
          });
        },
        onError: (message) => {
          setTurns((prev) => {
            const next = prev.slice();
            const cur = next[assistantIdx];
            if (cur && cur.role === 'assistant') {
              next[assistantIdx] = {
                role: 'assistant',
                content: cur.content || `Sorry — ${message}`,
                streaming: false,
              };
            }
            return next;
          });
        },
      },
      ctl.signal,
    );

    setBusy(false);
    abortRef.current = null;

    if (outcome.kind === 'sign_in_required') onSignInRequired();
    else if (outcome.kind === 'purchase_required') onPurchaseRequired();
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View className="flex-1">
        {/* Header */}
        <View
          className="flex-row items-center justify-between"
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderColor: tokens.pillBorder,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons name="sparkles" size={16} color={accent} />
            <Text style={{ fontFamily: serif, fontSize: 16, fontWeight: '600', color: tokens.ink }}>
              Ask the book
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ borderWidth: 1, borderColor: tokens.pillBorder }}
          >
            <Ionicons name="close" size={13} color={tokens.ink} />
          </Pressable>
        </View>

        {/* Transcript */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 14,
            gap: 14,
          }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {turns.length === 0 ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  fontFamily: serifItalic,
                  fontSize: 14,
                  color: tokens.inkSecondary,
                  lineHeight: 20,
                }}
              >
                Ask anything about Ignorance is not Bliss. Answers come from the book itself —
                if it doesn't say, the answer says so.
              </Text>
              <View style={{ gap: 6, marginTop: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => send(s)}
                    className="rounded-xl px-3 py-2 active:opacity-70"
                    style={{
                      borderWidth: 1,
                      borderColor: tokens.pillBorder,
                      backgroundColor: withAlpha(accent, 0.04),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 13,
                        color: tokens.ink,
                      }}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            turns.map((t, i) =>
              t.role === 'user' ? (
                <View key={i} style={{ alignItems: 'flex-end' }}>
                  <View
                    style={{
                      maxWidth: '88%',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 16,
                      backgroundColor: withAlpha(accent, 0.14),
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: serif,
                        fontSize: 14,
                        color: tokens.ink,
                        lineHeight: 19,
                      }}
                    >
                      {t.content}
                    </Text>
                  </View>
                </View>
              ) : (
                <Animated.View key={i} entering={FadeIn.duration(140)}>
                  <Text
                    style={{
                      fontFamily: serif,
                      fontSize: 14,
                      lineHeight: 21,
                      color: tokens.ink,
                    }}
                  >
                    {t.content}
                    {t.streaming ? (
                      <Text style={{ color: tokens.inkTertiary }}>{t.content ? '|' : ''}</Text>
                    ) : null}
                  </Text>
                  {t.streaming && !t.content ? (
                    <ActivityIndicator size="small" color={accent} style={{ marginTop: 4 }} />
                  ) : null}
                </Animated.View>
              ),
            )
          )}
        </ScrollView>

        {/* Composer */}
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 12,
            borderTopWidth: 1,
            borderColor: tokens.pillBorder,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: 16,
              backgroundColor: tokens.bgSoft,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: tokens.pillBorder,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask the book…"
              placeholderTextColor={tokens.inkTertiary}
              multiline
              editable={!busy}
              onSubmitEditing={() => send(input)}
              blurOnSubmit
              returnKeyType="send"
              style={{
                fontFamily: serif,
                fontSize: 14,
                color: tokens.ink,
                maxHeight: 120,
                padding: 0,
              }}
            />
          </View>
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || busy}
            accessibilityLabel="Send"
            style={{
              height: 40,
              width: 40,
              borderRadius: 999,
              backgroundColor: input.trim() && !busy ? accent : withAlpha(accent, 0.4),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function LockedCard({
  accent,
  ink,
  inkSecondary,
  inkTertiary,
  bgSoft,
  pillBorder,
  title,
  description,
  ctaLabel,
  ctaIcon,
  onCta,
  onClose,
}: {
  accent: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  bgSoft: string;
  pillBorder: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCta: () => void;
  onClose: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: pillBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles" size={16} color={accent} />
          <Text style={{ fontFamily: serif, fontSize: 16, fontWeight: '600', color: ink }}>
            {title}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Close"
          style={{
            height: 32,
            width: 32,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: pillBorder,
          }}
        >
          <Ionicons name="close" size={13} color={ink} />
        </Pressable>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingVertical: 20,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <View
          style={{
            height: 64,
            width: 64,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: withAlpha(accent, 0.14),
            borderWidth: 1,
            borderColor: withAlpha(accent, 0.4),
          }}
        >
          <Ionicons name="lock-closed" size={26} color={accent} />
        </View>
        <Text
          style={{
            fontFamily: serifItalic,
            fontSize: 15,
            color: inkSecondary,
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 320,
          }}
        >
          {description}
        </Text>

        <Pressable
          onPress={onCta}
          accessibilityLabel={ctaLabel}
          className="active:opacity-80"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 28,
            paddingVertical: 14,
            borderRadius: 999,
            backgroundColor: accent,
            marginTop: 4,
          }}
        >
          <Text
            style={{
              fontFamily: serif,
              fontSize: 16,
              fontWeight: '700',
              color: '#ffffff',
            }}
          >
            {ctaLabel}
          </Text>
          {ctaIcon ? <Ionicons name={ctaIcon} size={15} color="#ffffff" /> : null}
        </Pressable>
      </View>
    </View>
  );
}
