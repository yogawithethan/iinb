// MoreFromEthan — a reusable, expandable section listing Ethan's other
// projects and channels. The data comes from `iinb-shared/more-from-ethan.json`,
// mirrored into each consuming app's `content/` dir at build time.
//
// Usage:
//   <MoreFromEthan />                                   // default styling
//   <MoreFromEthan accent="#cc7755" />                  // override accent
//   <MoreFromEthan links={customLinks} />               // override data
//
// Designed to drop into any of Ethan's apps with theme tokens passed via
// `useSettings()` from that app — no other app-specific imports.

import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';

import { SVG_LOGOS } from '@/lib/logo-svg-map';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { serif, serifItalic } from '@/lib/fonts';
import { useSettings } from '@/lib/SettingsContext';
import { withAlpha } from '@/lib/theme';
import defaultLinks from '@/content/more-from-ethan.json';

export type MoreFromEthanLink = {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  /** Logical icon id — mapped to an Ionicons name in `iconFor`. Override
   *  per-app if you have brand-matched assets. */
  icon?: string;
  /** Optional filename in `assets/logos/` (e.g. "user-manual.png"). When set,
   *  the row renders this image instead of the Ionicons fallback. */
  image?: string;
  /** "app" gets a slightly different visual hint than "external". */
  kind?: 'app' | 'external';
};

type Props = {
  /** Heading shown above the chevron toggle. Defaults to the JSON's `label`. */
  label?: string;
  /** Override the data. Defaults to the shared JSON. */
  links?: MoreFromEthanLink[];
  /** Open the section by default instead of collapsed. */
  defaultOpen?: boolean;
};

const DEFAULT_DATA = defaultLinks as { label: string; links: MoreFromEthanLink[] };

export function MoreFromEthan({ label, links, defaultOpen }: Props) {
  const { tokens, accent } = useSettings();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const data = links ?? DEFAULT_DATA.links ?? [];
  const heading = label ?? DEFAULT_DATA.label ?? 'More from Ethan';

  return (
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
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className="flex-row items-center active:opacity-70"
        style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}
      >
        <Text style={{ fontFamily: serif, fontSize: 14, color: tokens.ink, flex: 1 }}>
          {heading}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={tokens.inkSecondary}
        />
      </Pressable>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(140)}
          style={{ paddingHorizontal: 8, paddingBottom: 10, gap: 4 }}
        >
          {data.map((link) => (
            <LinkRow key={link.id} link={link} accent={accent} tokens={tokens} />
          ))}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function LinkRow({
  link,
  accent,
  tokens,
}: {
  link: MoreFromEthanLink;
  accent: string;
  tokens: ReturnType<typeof useSettings>['tokens'];
}) {
  return (
    <Pressable
      onPress={() => {
        Linking.openURL(link.url).catch(() => undefined);
      }}
      className="flex-row items-center rounded-xl active:opacity-70"
      style={{ paddingHorizontal: 10, paddingVertical: 10, gap: 12 }}
    >
      {(() => {
        // Resolution order: SVG component → raster image → Ionicons glyph.
        const SvgComponent = link.image ? SVG_LOGOS[link.image] : undefined;
        const rasterSource = link.image && !SvgComponent ? imageSourceFor(link.image) : undefined;
        const hasLogo = Boolean(SvgComponent || rasterSource);
        return (
          <View
            className="items-center justify-center"
            style={{
              height: 34,
              width: 34,
              // Wordmark/brand logos render in a transparent square (contain) so
              // they aren't clipped. The Ionicons fallback keeps the accent
              // circle so it visually pairs with the rest of the row.
              borderRadius: hasLogo ? 0 : 999,
              backgroundColor: hasLogo ? 'transparent' : withAlpha(accent, 0.14),
            }}
          >
            {SvgComponent ? (
              // Use width="100%" + height="100%" so react-native-svg honors
              // the SVG's own viewBox + preserveAspectRatio (defaults to
              // xMidYMid meet → contain). Forcing 34×34 directly can clip
              // logos with non-square viewBoxes (e.g. YouTube's wide mark).
              <SvgComponent width="100%" height="100%" />
            ) : rasterSource ? (
              <Image
                source={rasterSource}
                style={{ width: 34, height: 34 }}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name={iconFor(link.icon ?? link.id)} size={16} color={accent} />
            )}
          </View>
        );
      })()}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: serif, fontSize: 14, color: tokens.ink }}>
          {link.title}
        </Text>
        {link.subtitle ? (
          <Text
            style={{
              fontFamily: serifItalic,
              fontSize: 12,
              color: tokens.inkTertiary,
              marginTop: 1,
            }}
          >
            {link.subtitle}
          </Text>
        ) : null}
      </View>
      {/* All rows open an external URL via Linking.openURL — render the same
          quiet chevron so the eye reads the section as a list, not a grid of
          mismatched intents. */}
      <Ionicons name="chevron-forward" size={14} color={tokens.inkTertiary} />
    </Pressable>
  );
}

/**
 * Static require map for raster logos. Metro needs literal paths — dynamic
 * strings can't be bundled. Add a new file to iinb-shared/assets/logos/,
 * run `node scripts/build-chapters.mjs`, and add an entry here.
 */
function imageSourceFor(filename: string) {
  switch (filename) {
    case 'user-manual.png':
      return require('@/assets/logos/user-manual.png');
    case 'newsletter.png':
      return require('@/assets/logos/newsletter.png');
    default:
      return undefined;
  }
}

/**
 * Map a logical icon id to an Ionicons glyph. Centralized so a single edit
 * here (or per-app override of the icon field in the JSON) updates every
 * surface that renders the link list.
 */
function iconFor(id?: string): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'user-manual':
      return 'book-outline';
    case 'ywe':
      return 'leaf-outline';
    case 'youtube':
      return 'logo-youtube';
    case 'instagram':
      return 'logo-instagram';
    case 'newsletter':
      return 'mail-outline';
    case 'telegram':
      return 'paper-plane-outline';
    case 'iinb':
      return 'library-outline';
    case 'tcot':
      return 'compass-outline';
    case 'tts':
      return 'cafe-outline';
    default:
      return 'arrow-forward-circle-outline';
  }
}
