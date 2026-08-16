"use client";

import { forwardRef } from "react";
import clsx from "clsx";
import { LockIcon } from "./icons";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  sm: "h-8 w-8 text-[15px]",
  md: "h-10 w-10 text-[16px]",
  lg: "h-11 w-11 text-[18px]",
};

type Props = {
  label: string;
  onClick?: () => void;
  active?: boolean;
  dimmed?: boolean;
  locked?: boolean;
  size?: Size;
  children: React.ReactNode;
  className?: string;
};

export const GlassBubble = forwardRef<HTMLButtonElement, Props>(
  function GlassBubble(
    {
      label,
      onClick,
      active,
      dimmed,
      locked,
      size = "md",
      children,
      className,
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={clsx(
          "glass-bubble pointer-events-auto relative flex items-center justify-center rounded-full transition-all duration-200",
          "hover:scale-[1.04] active:scale-95",
          sizeMap[size],
          active && "bubble-active",
          dimmed && "opacity-25 pointer-events-none",
          className,
        )}
        style={
          active
            ? {
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
                borderColor:
                  "color-mix(in srgb, var(--accent) 30%, transparent)",
              }
            : undefined
        }
      >
        {children}
        {locked && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[13px] w-[13px] items-center justify-center rounded-full"
            style={{
              background: "var(--accent)",
              color: "#fff",
              border: "1.5px solid var(--bg)",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.15)",
            }}
          >
            <LockIcon size={7} />
          </span>
        )}
      </button>
    );
  },
);
