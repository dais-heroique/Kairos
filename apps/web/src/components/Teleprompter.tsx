"use client";

import { useEffect, useRef, useState } from "react";

// Aucune dépendance IA/Firebase — entièrement autonome et testable. Plein
// écran, vitesse réglable, mode miroir (tournage face à un téléphone en
// reflet), fort contraste.
export interface TeleprompterProps {
  script: string;
  onClose?: () => void;
}

const MIN_SPEED = 20; // px/s
const MAX_SPEED = 200;
const DEFAULT_SPEED = 60;

export function Teleprompter({ script, onClose }: TeleprompterProps) {
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [mirrored, setMirrored] = useState(false);
  const [highContrast, setHighContrast] = useState(true);
  const [playing, setPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (scrollRef.current) scrollRef.current.scrollTop += speed * dt;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundColor: highContrast ? "#000" : "var(--color-surface)",
        color: highContrast ? "#fff" : "var(--color-ink)",
      }}
      data-testid="teleprompter"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded-full px-4 py-1 text-sm font-semibold"
          style={{ backgroundColor: "var(--color-coral)", color: "#fff" }}
          data-testid="play-toggle"
        >
          {playing ? "Pause" : "Lecture"}
        </button>

        <label className="flex items-center gap-2 text-xs">
          Vitesse
          <input
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            data-testid="speed-slider"
          />
        </label>

        <button
          type="button"
          onClick={() => setMirrored((m) => !m)}
          aria-pressed={mirrored}
          data-testid="mirror-toggle"
          className="text-xs font-semibold"
        >
          Miroir {mirrored ? "✓" : ""}
        </button>

        <button
          type="button"
          onClick={() => setHighContrast((c) => !c)}
          aria-pressed={highContrast}
          data-testid="contrast-toggle"
          className="text-xs font-semibold"
        >
          Contraste {highContrast ? "✓" : ""}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le téléprompteur"
            data-testid="close-button"
            className="text-xs font-semibold"
          >
            ✕
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        data-testid="scroll-area"
        className="flex-1 overflow-y-auto px-6 py-10 text-3xl leading-relaxed font-semibold whitespace-pre-wrap"
        style={mirrored ? { transform: "scaleX(-1)" } : undefined}
      >
        {script}
      </div>
    </div>
  );
}
