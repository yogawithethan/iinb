"use client";

/**
 * Central icon registry. Built on Phosphor Icons so every glyph shares
 * the same rounded aesthetic and filled-or-bold weight. Named exports
 * match the earlier hand-rolled set so nothing else in the codebase
 * needs to change.
 *
 * Weight choices:
 *   - "fill"    — decorative/soft glyphs (bookmark, play, lock, etc.)
 *   - "bold"    — utility glyphs that benefit from strokes (x, check,
 *                 magnifier, refresh, share, copy, list)
 */

import type { ComponentType } from "react";
import {
  ArrowClockwise,
  Bookmark,
  BookOpen,
  Check,
  CopySimple,
  Eye,
  GearSix,
  Highlighter,
  Info,
  List,
  MagnifyingGlass,
  MusicNote,
  NotePencil,
  Play,
  ShareFat,
  Sparkle,
  SpeakerHigh,
  Sun,
  X,
  type IconProps as PhosphorIconProps,
  type IconWeight,
} from "@phosphor-icons/react";

type LocalIconProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

function wrap(
  Icon: ComponentType<PhosphorIconProps>,
  weight: IconWeight,
): ComponentType<LocalIconProps> {
  const Wrapped = ({ size = 18, className, style }: LocalIconProps) => (
    <Icon
      size={size}
      weight={weight}
      className={className}
      style={style}
    />
  );
  Wrapped.displayName = `Icon(${Icon.displayName ?? "Anon"})`;
  return Wrapped;
}

export const TocIcon = wrap(List, "bold");
export const BookmarkIcon = wrap(Bookmark, "fill");
export const GearIcon = wrap(GearSix, "fill");
export const SparkleIcon = wrap(Sparkle, "fill");
export const PlayIcon = wrap(Play, "fill");
export const SearchIcon = wrap(MagnifyingGlass, "bold");
export const ShareIcon = wrap(ShareFat, "bold");
export const XIcon = wrap(X, "bold");
export const SunIcon = wrap(Sun, "fill");
export const BookIcon = wrap(BookOpen, "fill");
export const MusicIcon = wrap(MusicNote, "fill");
export const EyeIcon = wrap(Eye, "fill");
export const RefreshIcon = wrap(ArrowClockwise, "bold");
export const InfoIcon = wrap(Info, "fill");
// Hero Icons — lock-closed (solid).
export const LockIcon = ({ size = 18, className, style }: LocalIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
    style={style}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
      clipRule="evenodd"
    />
  </svg>
);
LockIcon.displayName = "LockIcon";
export const HighlightIcon = wrap(Highlighter, "fill");
export const NoteIcon = wrap(NotePencil, "fill");
export const CopyIcon = wrap(CopySimple, "bold");
export const SpeakerIcon = wrap(SpeakerHigh, "fill");
export const CheckIcon = wrap(Check, "bold");
