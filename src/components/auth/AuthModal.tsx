"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  useReaderSettings,
  type Theme,
  type Decade,
} from "@/components/reader/SettingsContext";
import {
  BookmarkIcon,
  CheckIcon,
  HighlightIcon,
  NoteIcon,
  PlayIcon,
  RefreshIcon,
  SearchIcon,
  SparkleIcon,
  XIcon,
} from "@/components/reader/icons";

type Step =
  | "entry"
  | "password"
  | "welcome"
  | "unlocked"
  | "preferences"
  | "profile"
  | "tryit";

type EntryTab = "license" | "login";

type Props = {
  open: boolean;
  initialMode?: EntryTab;
  onClose: () => void;
};

const DECADES: Decade[] = ["70s", "80s", "90s", "00s", "10s"];
const HUMOR_OPTIONS = ["Dry / deadpan", "Absurdist", "Pop-culture", "Keep it serious"];
const CULTURE_OPTIONS = [
  "Gaming",
  "Sports",
  "Cooking",
  "Music",
  "Tech",
  "Fitness",
  "Film/TV",
  "Parenting",
];
const THEME_PREVIEWS: { id: Theme; label: string; bg: string; ink: string }[] = [
  { id: "light", label: "Light", bg: "#ffffff", ink: "#1a1a1a" },
  { id: "dark", label: "Dark", bg: "#18181b", ink: "#ededed" },
  { id: "sepia", label: "Sepia", bg: "#f5ecd7", ink: "#3a2a17" },
  { id: "oled", label: "OLED", bg: "#000000", ink: "#f2f2f2" },
];

export function AuthModal({ open, initialMode = "license", onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("entry");
  const [tab, setTab] = useState<EntryTab>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { update, theme, fontSize, refreshProfile } = useReaderSettings();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setStep("entry");
      setTab(initialMode);
      setError(null);
    }
  }, [open, initialMode]);

  if (!mounted || !open) return null;

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not sign in.");
        return;
      }
      // Returning reader — straight into purchased state, no onboarding
      update({
        purchased: true,
        onboarded: true,
        userEmail: data.email ?? email,
      });
      onClose();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitLicense(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/validate-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, licenseKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "License validation failed.");
        return;
      }
      setStep("password");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    // MVP: we don't actually persist the password here — Supabase will take
    // over once auth is wired. For now, just proceed.
    update({ userEmail: email });
    setStep("welcome");
  }

  function completeOnboarding() {
    update({ purchased: true, onboarded: true, userEmail: email });
    onClose();
  }

  function skipOnboarding() {
    update({ purchased: true, onboarded: true, userEmail: email });
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={step === "entry" ? onClose : undefined}
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(16px) saturate(1.1)",
          WebkitBackdropFilter: "blur(16px) saturate(1.1)",
          background: "color-mix(in srgb, var(--bg) 40%, transparent)",
        }}
      />

      {/* Modal */}
      <div
        className="glass-capsule relative flex w-full max-w-[440px] flex-col overflow-hidden rounded-[22px]"
        style={{ maxHeight: "calc(100vh - 48px)" }}
      >
        {/* Close X (always present except during onboarding "welcome") */}
        {step === "entry" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
            style={{
              color: "var(--ink-secondary)",
              border: "1px solid var(--pill-border)",
            }}
          >
            <XIcon size={14} />
          </button>
        )}

        <div className="overflow-y-auto">
          {step === "entry" && (
            <EntryStep
              tab={tab}
              setTab={(t) => {
                setTab(t);
                setError(null);
              }}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              licenseKey={licenseKey}
              setLicenseKey={setLicenseKey}
              loading={loading}
              error={error}
              onLogin={submitLogin}
              onLicense={submitLicense}
            />
          )}
          {step === "password" && (
            <PasswordStep
              email={email}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              error={error}
              onSubmit={submitPassword}
            />
          )}
          {step === "welcome" && (
            <WelcomeStep
              onNext={() => setStep("unlocked")}
              onSkip={skipOnboarding}
              stepIndex={0}
            />
          )}
          {step === "unlocked" && (
            <UnlockedStep
              onNext={() => setStep("preferences")}
              onBack={() => setStep("welcome")}
              stepIndex={1}
            />
          )}
          {step === "preferences" && (
            <PreferencesStep
              theme={theme}
              fontSize={fontSize}
              onChange={(patch) => update(patch)}
              onNext={() => setStep("profile")}
              onBack={() => setStep("unlocked")}
              stepIndex={2}
            />
          )}
          {step === "profile" && (
            <ProfileStep
              profile={refreshProfile}
              onChange={(next) => update({ refreshProfile: next })}
              onNext={() => setStep("tryit")}
              onBack={() => setStep("preferences")}
              stepIndex={3}
            />
          )}
          {step === "tryit" && (
            <TryItStep
              onFinish={completeOnboarding}
              onBack={() => setStep("profile")}
              stepIndex={4}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Steps ---------------- */

function EntryStep(props: {
  tab: EntryTab;
  setTab: (t: EntryTab) => void;
  email: string;
  setEmail: (s: string) => void;
  password: string;
  setPassword: (s: string) => void;
  licenseKey: string;
  setLicenseKey: (s: string) => void;
  loading: boolean;
  error: string | null;
  onLogin: (e: React.FormEvent) => void;
  onLicense: (e: React.FormEvent) => void;
}) {
  const {
    tab,
    setTab,
    email,
    setEmail,
    password,
    setPassword,
    licenseKey,
    setLicenseKey,
    loading,
    error,
    onLogin,
    onLicense,
  } = props;
  return (
    <div className="px-6 pb-6 pt-10">
      <h2
        className="mb-1 text-center text-[20px] font-medium"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Welcome back
      </h2>
      <p
        className="mb-5 text-center text-[12px]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Log in or unlock with your license key.
      </p>

      <TabSwitcher
        tab={tab}
        onChange={setTab}
        options={[
          { id: "login", label: "Log in" },
          { id: "license", label: "License key" },
        ]}
      />

      {tab === "login" ? (
        <form onSubmit={onLogin} className="mt-5 flex flex-col gap-3">
          <TextInput
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
          />
          <TextInput
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            required
          />
          {error && <ErrorText>{error}</ErrorText>}
          <PrimaryButton loading={loading} label="Log in" />
        </form>
      ) : (
        <form onSubmit={onLicense} className="mt-5 flex flex-col gap-3">
          <TextInput
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
          />
          <TextInput
            type="text"
            placeholder="License key (e.g. IINB-TEST-2026)"
            value={licenseKey}
            onChange={setLicenseKey}
            required
          />
          {error && <ErrorText>{error}</ErrorText>}
          <PrimaryButton loading={loading} label="Unlock" />
          <p
            className="mt-1 text-center text-[11px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            Lemon Squeezy emails the key after purchase.
          </p>
        </form>
      )}
    </div>
  );
}

function PasswordStep(props: {
  email: string;
  password: string;
  setPassword: (s: string) => void;
  confirmPassword: string;
  setConfirmPassword: (s: string) => void;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const {
    email,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    onSubmit,
  } = props;
  return (
    <div className="px-6 pb-6 pt-10">
      <h2
        className="mb-1 text-center text-[20px] font-medium"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Create a password
      </h2>
      <p
        className="mb-5 text-center text-[12px]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        You'll use this to sign in next time with {email}.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <TextInput
          type="password"
          placeholder="New password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          required
        />
        <TextInput
          type="password"
          placeholder="Confirm password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          required
        />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton label="Continue" />
      </form>
    </div>
  );
}

function WelcomeStep({
  onNext,
  onSkip,
  stepIndex,
}: {
  onNext: () => void;
  onSkip: () => void;
  stepIndex: number;
}) {
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center">
      <OnboardingDots total={5} active={stepIndex} />
      <h2
        className="mt-8 mb-2 text-[28px] leading-tight"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Ignorance is not Bliss
      </h2>
      <p
        className="mb-1 text-[13px]"
        style={{ color: "var(--ink-secondary)" }}
      >
        Ethan Hill
      </p>
      <p
        className="mb-8 max-w-[300px] text-[14px] italic leading-snug"
        style={{
          color: "var(--ink-secondary)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        A travel journal written by the child still on the path.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-full py-3 text-[14px] font-semibold transition-transform active:scale-[0.98]"
        style={{
          background: "var(--accent)",
          color: "#fff",
          fontFamily:
            "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        Begin
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 text-[12px] underline underline-offset-4 transition-opacity hover:opacity-70"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Skip setup
      </button>
    </div>
  );
}

function PreferencesStep({
  theme,
  fontSize,
  onChange,
  onNext,
  onBack,
  stepIndex,
}: {
  theme: Theme;
  fontSize: number;
  onChange: (patch: { theme?: Theme; fontSize?: number }) => void;
  onNext: () => void;
  onBack: () => void;
  stepIndex: number;
}) {
  return (
    <div className="flex flex-col px-6 pb-6 pt-10">
      <OnboardingDots total={5} active={stepIndex} />
      <h2
        className="mt-6 mb-5 text-center text-[20px] font-medium"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Reading preferences
      </h2>

      <StepLabel>Theme</StepLabel>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {THEME_PREVIEWS.map((t) => {
          const selected = theme === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ theme: t.id })}
              aria-pressed={selected}
              className="flex flex-col items-center gap-1.5 rounded-[14px] p-2 transition-all active:scale-95"
              style={{
                border: selected
                  ? "1.5px solid var(--accent)"
                  : "1px solid var(--pill-border)",
                background: selected ? "var(--accent-soft)" : "transparent",
              }}
            >
              <span
                aria-hidden
                className="flex h-10 w-full items-center justify-center rounded-[9px] font-serif text-[15px]"
                style={{
                  background: t.bg,
                  color: t.ink,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                Aa
              </span>
              <span
                className="text-[11px]"
                style={{
                  color: selected ? "var(--accent-ink)" : "var(--ink-secondary)",
                }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <StepLabel>Text size</StepLabel>
      <div className="mb-2 flex items-center gap-3">
        <span className="font-serif" style={{ color: "var(--ink-secondary)", fontSize: 13 }}>
          A
        </span>
        <input
          type="range"
          min={12}
          max={28}
          value={fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="iinb-slider flex-1"
        />
        <span className="font-serif" style={{ color: "var(--ink-secondary)", fontSize: 22 }}>
          A
        </span>
      </div>
      <p className="mb-4 text-right text-[11px] tabular-nums" style={{ color: "var(--ink-tertiary)" }}>
        {fontSize}px
      </p>

      <p
        className="mb-6 text-[11.5px] leading-snug"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Tip: each theme remembers its own accent color — so your
        Light theme can be teal while Dark stays blue. Pick yours
        later in <strong>Settings → Display → Accent color</strong>.
      </p>

      <FooterNav onBack={onBack} onNext={onNext} nextLabel="Next" />
      <style jsx>{`
        .iinb-slider {
          appearance: none;
          -webkit-appearance: none;
          height: 4px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--ink-tertiary) 35%, transparent);
          outline: none;
        }
        .iinb-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          border: 2px solid var(--bg);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function ProfileStep({
  profile,
  onChange,
  onNext,
  onBack,
  stepIndex,
}: {
  profile: {
    decade: Decade | null;
    humor: string[];
    culture: string[];
  };
  onChange: (next: { decade: Decade | null; humor: string[]; culture: string[] }) => void;
  onNext: () => void;
  onBack: () => void;
  stepIndex: number;
}) {
  function toggle(arr: string[], v: string) {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }
  return (
    <div className="flex flex-col px-6 pb-6 pt-10">
      <OnboardingDots total={5} active={stepIndex} />
      <h2
        className="mt-6 mb-1 text-center text-[20px] font-medium"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Personalize your refresh
      </h2>
      <p
        className="mb-5 text-center text-[12px]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Helps the refresh button rewrite examples in your voice.
      </p>

      <StepLabel>Decade you grew up in</StepLabel>
      <div className="mb-5 grid grid-cols-5 gap-1.5">
        {DECADES.map((d) => (
          <PillButton
            key={d}
            selected={profile.decade === d}
            onClick={() => onChange({ ...profile, decade: d })}
            label={d}
          />
        ))}
      </div>

      <StepLabel>Humor preference (pick any)</StepLabel>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {HUMOR_OPTIONS.map((h) => (
          <PillButton
            key={h}
            selected={profile.humor.includes(h)}
            onClick={() =>
              onChange({ ...profile, humor: toggle(profile.humor, h) })
            }
            label={h}
          />
        ))}
      </div>

      <StepLabel>Cultural world (pick any)</StepLabel>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {CULTURE_OPTIONS.map((c) => (
          <PillButton
            key={c}
            selected={profile.culture.includes(c)}
            onClick={() =>
              onChange({ ...profile, culture: toggle(profile.culture, c) })
            }
            label={c}
          />
        ))}
      </div>

      <FooterNav onBack={onBack} onNext={onNext} nextLabel="Next" />
    </div>
  );
}

function UnlockedStep({
  onNext,
  onBack,
  stepIndex,
}: {
  onNext: () => void;
  onBack: () => void;
  stepIndex: number;
}) {
  const unlocks = [
    { icon: <PlayIcon />, label: "Author narration with karaoke sync" },
    { icon: <SparkleIcon />, label: "AI Q&A grounded in the actual text" },
    { icon: <RefreshIcon />, label: "Refresh — rewrite examples in your voice" },
    {
      icon: <HighlightIcon />,
      label: "Highlights, notes, and a personal accent color per theme",
    },
  ];
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-10 text-center">
      <OnboardingDots total={5} active={stepIndex} />

      <div
        className="mt-8 mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent-ink)",
        }}
      >
        <CheckIcon size={28} />
      </div>

      <h2
        className="mb-2 text-[24px] leading-tight"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Everything is yours now
      </h2>
      <p
        className="mb-6 max-w-[320px] text-[13px] leading-snug"
        style={{ color: "var(--ink-secondary)" }}
      >
        All chapters, the author's audio, AI Q&A, and every reading tool
        are unlocked. Here's a quick taste:
      </p>

      <ul className="mb-8 flex w-full flex-col gap-2.5 text-left">
        {unlocks.map((u, i) => (
          <li key={i} className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-ink)",
              }}
            >
              {u.icon}
            </span>
            <span
              className="text-[13px]"
              style={{ color: "var(--ink-secondary)" }}
            >
              {u.label}
            </span>
          </li>
        ))}
      </ul>

      <FooterNav onBack={onBack} onNext={onNext} nextLabel="Next" />
    </div>
  );
}

function TryItStep({
  onFinish,
  onBack,
  stepIndex,
}: {
  onFinish: () => void;
  onBack: () => void;
  stepIndex: number;
}) {
  return (
    <div className="flex flex-col px-6 pb-6 pt-10">
      <OnboardingDots total={5} active={stepIndex} />
      <h2
        className="mt-6 mb-1 text-center text-[20px] font-medium"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Three touches worth knowing
      </h2>
      <p
        className="mb-5 text-center text-[12px]"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Try the glossary now, then the rest when you're reading.
      </p>

      <GlossaryDemoCard />
      <HighlightsDemoCard />
      <ShortcutsCard />

      <FooterNav
        onBack={onBack}
        onNext={onFinish}
        nextLabel="Start reading"
        primary
      />
    </div>
  );
}

function GlossaryDemoCard() {
  const [showTip, setShowTip] = useState(false);
  const ref = React.useRef<HTMLSpanElement | null>(null);
  return (
    <div
      className="mb-3 rounded-xl px-3 py-3"
      style={{ border: "1px solid var(--pill-border)" }}
    >
      <StepLabel>Glossary</StepLabel>
      <p
        className="mt-1 text-[13.5px] leading-snug"
        style={{
          color: "var(--ink)",
          fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
        }}
      >
        Dashed underlines mark words explained in the glossary — like{" "}
        <span
          ref={ref}
          role="button"
          tabIndex={0}
          onClick={() => setShowTip((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowTip((v) => !v);
            }
          }}
          style={{
            borderBottom: "1.5px dashed var(--accent)",
            cursor: "pointer",
          }}
        >
          anicca
        </span>
        . Tap it to see the meaning.
      </p>
      {showTip && (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-[12px]"
          style={{
            background:
              "color-mix(in srgb, var(--accent) 6%, var(--bg-soft))",
            border: "1px solid var(--accent)",
          }}
        >
          <div className="flex items-baseline gap-2">
            <span
              className="text-[14px] italic"
              style={{
                color: "var(--ink)",
                fontFamily: "var(--font-lora), ui-serif, Georgia, serif",
              }}
            >
              anicca
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              ah-NEE-chah · Pali
            </span>
          </div>
          <p
            className="mt-1 leading-snug"
            style={{ color: "var(--ink-secondary)" }}
          >
            Impermanence — the characteristic of everything arising and
            passing away.
          </p>
        </div>
      )}
      <p
        className="mt-2 text-[11px] leading-snug"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Browse every term under the bookmark bubble → Glossary tab.
      </p>
    </div>
  );
}

function HighlightsDemoCard() {
  return (
    <div
      className="mb-3 rounded-xl px-3 py-3"
      style={{ border: "1px solid var(--pill-border)" }}
    >
      <StepLabel>Highlights & notes</StepLabel>
      <p
        className="mt-1 text-[13px] leading-snug"
        style={{ color: "var(--ink-secondary)" }}
      >
        Select any passage and a small popover appears. Tap{" "}
        <InlinePill bg="var(--accent-soft)" color="var(--accent-ink)">
          <HighlightIcon size={12} />
        </InlinePill>{" "}
        to highlight it, <InlinePill><NoteIcon size={12} /></InlinePill> to
        attach a note, or <InlinePill><span style={{ fontSize: 11 }}>⧉</span></InlinePill>{" "}
        to copy it with attribution. Everything lives under the{" "}
        <InlinePill><BookmarkIcon size={12} /></InlinePill> bubble.
      </p>
    </div>
  );
}

function ShortcutsCard() {
  return (
    <div
      className="mb-5 rounded-xl px-3 py-3"
      style={{ border: "1px solid var(--pill-border)" }}
    >
      <StepLabel>A few more</StepLabel>
      <ul
        className="mt-1 flex flex-col gap-1.5 text-[12.5px]"
        style={{ color: "var(--ink-secondary)" }}
      >
        <li className="flex items-center gap-2">
          <InlinePill>
            <SearchIcon size={12} />
          </InlinePill>
          <span>
            <Kbd>⌘F</Kbd> or the magnifying glass searches the whole book.
          </span>
        </li>
        <li className="flex items-center gap-2">
          <InlinePill>
            <SparkleIcon size={12} />
          </InlinePill>
          <span>Tap the sparkle bubble to ask Claude about the book.</span>
        </li>
        <li className="flex items-center gap-2">
          <InlinePill>
            <RefreshIcon size={12} />
          </InlinePill>
          <span>
            Inline refresh icons rewrite passages using your profile.
          </span>
        </li>
      </ul>
    </div>
  );
}

function InlinePill({
  children,
  bg,
  color,
}: {
  children: React.ReactNode;
  bg?: string;
  color?: string;
}) {
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full align-middle"
      style={{
        background:
          bg ?? "color-mix(in srgb, var(--ink-tertiary) 14%, transparent)",
        color: color ?? "var(--ink-secondary)",
      }}
    >
      {children}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="rounded px-1.5 py-0.5 text-[11px]"
      style={{
        background:
          "color-mix(in srgb, var(--ink-tertiary) 14%, transparent)",
        color: "var(--ink)",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}
    >
      {children}
    </kbd>
  );
}

/* ---------------- Primitives ---------------- */

function TabSwitcher({
  tab,
  onChange,
  options,
}: {
  tab: EntryTab;
  onChange: (t: EntryTab) => void;
  options: { id: EntryTab; label: string }[];
}) {
  return (
    <div
      role="tablist"
      className="relative flex rounded-full p-[3px]"
      style={{ background: "var(--bg-soft)" }}
    >
      <div
        aria-hidden
        className="absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-full transition-transform duration-[220ms] ease-out"
        style={{
          left: 3,
          background: "var(--bg)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
          transform:
            options[0].id === tab ? "translateX(0)" : "translateX(100%)",
        }}
      />
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={tab === o.id}
          onClick={() => onChange(o.id)}
          className="relative flex-1 rounded-full py-1.5 text-[13px] transition-colors"
          style={{
            color: tab === o.id ? "var(--ink)" : "var(--ink-tertiary)",
            fontWeight: tab === o.id ? 600 : 500,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TextInput({
  type = "text",
  placeholder,
  autoComplete,
  value,
  onChange,
  required,
}: {
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (s: string) => void;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none transition-colors"
      style={{
        color: "var(--ink)",
        background: "transparent",
        border: "1px solid var(--pill-border)",
        fontFamily:
          "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    />
  );
}

function PrimaryButton({
  label,
  loading,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-full py-2.5 text-[14px] font-semibold transition-transform active:scale-[0.98]"
      style={{
        background: "var(--accent)",
        color: "#fff",
        fontFamily:
          "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "…" : label}
    </button>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="text-center text-[12px]"
      style={{ color: "#c0392b" }}
    >
      {children}
    </p>
  );
}

function PillButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="rounded-full px-3 py-1.5 text-[12px] transition-all active:scale-[0.98]"
      style={{
        border: selected
          ? "1.5px solid var(--accent)"
          : "1px solid var(--pill-border)",
        background: selected ? "var(--accent-soft)" : "transparent",
        color: selected ? "var(--accent-ink)" : "var(--ink-secondary)",
        fontWeight: selected ? 600 : 500,
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {label}
    </button>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em]"
      style={{ color: "var(--ink-tertiary)" }}
    >
      {children}
    </h3>
  );
}

function OnboardingDots({
  total,
  active,
}: {
  total: number;
  active: number;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className="h-1.5 rounded-full transition-all"
          style={{
            background:
              i === active
                ? "var(--accent)"
                : "color-mix(in srgb, var(--ink-tertiary) 30%, transparent)",
            width: i === active ? 18 : 6,
          }}
        />
      ))}
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextLabel,
  primary,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  primary?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="text-[13px] transition-opacity hover:opacity-70"
        style={{ color: "var(--ink-tertiary)" }}
      >
        Back
      </button>
      <button
        type="button"
        onClick={onNext}
        className="rounded-full px-5 py-2 text-[13px] font-semibold transition-transform active:scale-[0.98]"
        style={{
          background: primary ? "var(--accent)" : "var(--ink)",
          color: primary ? "#fff" : "var(--bg)",
          fontFamily:
            "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {nextLabel}
      </button>
    </div>
  );
}
