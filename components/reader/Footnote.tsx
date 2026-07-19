import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TYPE_IN_MS = 18;
const TYPE_OUT_MS = 8;

type Phase = 'in' | 'idle' | 'out' | 'morphed';

/**
 * Streamed footnote rendered inline. Phases:
 *   in       — text types in, blinking cursor at the end.
 *   idle     — full text + tappable × in accent color.
 *   out      — × tapped: text deletes one character at a time, fast.
 *   morphed  — text fully gone: × replaced by the document icon for a beat
 *              before onClose fires, so the closing motion feels like the
 *              × becomes the icon again.
 */
export function FootnoteStream({
  text,
  color,
  accent,
  italic,
  fontFamily,
  italicFamily,
  iconSize,
  onClose,
}: {
  text: string;
  color: string;
  accent: string;
  italic: boolean;
  fontFamily: string;
  italicFamily: string;
  iconSize: number;
  onClose: () => void;
}) {
  const fullStream = ' ' + text;
  const [streamed, setStreamed] = useState('');
  const [phase, setPhase] = useState<Phase>('in');
  const morphTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drive type-in / type-out animations.
  useEffect(() => {
    if (phase === 'in') {
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        if (i >= fullStream.length) {
          clearInterval(id);
          setStreamed(fullStream);
          setPhase('idle');
        } else {
          setStreamed(fullStream.slice(0, i));
        }
      }, TYPE_IN_MS);
      return () => clearInterval(id);
    }
    if (phase === 'out') {
      let i = fullStream.length;
      const id = setInterval(() => {
        i -= 1;
        if (i <= 0) {
          clearInterval(id);
          setStreamed('');
          setPhase('morphed');
        } else {
          setStreamed(fullStream.slice(0, i));
        }
      }, TYPE_OUT_MS);
      return () => clearInterval(id);
    }
    if (phase === 'morphed') {
      // Brief beat where the × has become the icon, then unmount.
      morphTimer.current = setTimeout(onClose, 90);
      return () => {
        if (morphTimer.current) clearTimeout(morphTimer.current);
      };
    }
  }, [phase, fullStream, onClose]);

  const startClose = () => {
    if (phase === 'idle') setPhase('out');
  };

  return (
    <Text
      style={{
        color,
        fontFamily: italic ? italicFamily : fontFamily,
        fontStyle: italic ? 'italic' : 'normal',
      }}
    >
      {streamed}
      {phase === 'in' ? (
        <Text style={{ color, fontWeight: '400' }}>|</Text>
      ) : phase === 'morphed' ? (
        // × has morphed back into the document icon. Sits in the same slot.
        <Text style={{ color: accent }}>
          {' '}
          <Ionicons name="document-text-outline" size={iconSize} color={accent} />
          {' '}
        </Text>
      ) : (
        <Text
          onPress={phase === 'idle' ? startClose : undefined}
          style={{ color: accent, fontWeight: '700' }}
        >
          {' '}×
        </Text>
      )}
    </Text>
  );
}
