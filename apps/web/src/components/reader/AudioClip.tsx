"use client";

import { useEffect, useRef, useState } from "react";

// Slim inline audio player (play/pause + progress) with a barely-there frosted
// capsule. Used for short clips embedded in the prose via a {{audio:name}}
// marker — e.g. the kookaburra call in the Preface. The `label` is used only
// for accessibility; it is not displayed.
export function AudioClip({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () =>
      setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
    };
  }, []);

  function toggle() {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  return (
    <div className="iinb-audioclip" role="group" aria-label={label}>
      <button
        type="button"
        onClick={toggle}
        className="iinb-audioclip__btn"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1.4" />
            <rect x="14" y="5" width="4" height="14" rx="1.4" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.14v13.72c0 .86.95 1.38 1.68.92l10.5-6.86a1.1 1.1 0 0 0 0-1.84L9.68 4.22C8.95 3.76 8 4.28 8 5.14Z" />
          </svg>
        )}
      </button>
      <div className="iinb-audioclip__track" aria-hidden="true">
        <div
          className="iinb-audioclip__fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <audio ref={ref} src={src} preload="none" />
    </div>
  );
}
