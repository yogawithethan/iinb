"use client";

// The book cover — the very first thing in the reading flow, above the
// dedication. Rendered outside `.reader-prose` so the dark-mode line-art
// invert never touches this full-colour image.
export function CoverSection() {
  return (
    <section
      data-anchor-kind="cover"
      className="flex min-h-[92vh] w-full flex-col items-center justify-center px-6 pt-[120px] pb-8"
      style={{ scrollMarginTop: "120px" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/cover.jpg"
        alt="Ignorance Is Not Bliss — cover"
        className="h-auto w-auto rounded-[8px]"
        style={{
          maxHeight: "80vh",
          maxWidth: "min(100%, 380px)",
          boxShadow: "0 16px 48px rgba(26, 23, 18, 0.22)",
        }}
      />
    </section>
  );
}
