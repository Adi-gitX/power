import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * The launch moment, in the Perplexity register: the window is transparent, so
 * for the first beat the mark floats alone over the user's desktop — drawn on,
 * lit through, a chime — and only then does the app surface exist, scaling up
 * underneath it. The intro is the one place the app is theatrical; everything
 * after it is quiet.
 *
 * The chime is synthesized, not an asset. Two partials a fifth apart with a
 * soft attack and a long exponential release — the standard bell recipe — so
 * the app ships no audio file and the sound is exactly as long as the
 * animation needs. Skipped entirely under reduced motion, along with the
 * theatrics: the app simply appears.
 */
function chime(): void {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);

    for (const [freq, delay, level] of [
      [523.25, 0, 1], // C5
      [783.99, 0.09, 0.55], // G5, arriving just behind
      [1567.98, 0.09, 0.18], // shimmer partial
    ] as const) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 1.7);
    }
    setTimeout(() => void ctx.close(), 2200);
  } catch {
    /* no audio device; the intro is fine silent */
  }
}

export function Intro({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onDone();
      return;
    }

    chime();
    const q = gsap.utils.selector(root);
    const tl = gsap.timeline({ onComplete: onDone });

    // The slash draws itself, the dot lands, the wordmark breathes in beneath —
    // then the whole mark lifts slightly and hands over to the surface.
    tl.fromTo(
      q('[data-slash]'),
      { strokeDashoffset: 60 },
      { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' },
      0.15,
    )
      .fromTo(
        q('[data-dot]'),
        { scale: 0, transformOrigin: 'center' },
        { scale: 1, duration: 0.35, ease: 'back.out(3)' },
        '-=0.15',
      )
      .fromTo(
        q('[data-word]'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
        '-=0.1',
      )
      .to(q('[data-mark]'), { y: -8, duration: 0.45, ease: 'power2.inOut' }, '+=0.55')
      .to(root.current, { opacity: 0, duration: 0.4, ease: 'power2.in' }, '<0.1');
  }, [onDone]);

  return (
    <div
      ref={root}
      className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
    >
      <div data-mark className="flex flex-col items-center gap-4">
        <svg width="88" height="88" viewBox="0 0 64 64" aria-hidden="true">
          <path
            data-slash
            d="M40.5 14 L29 50"
            stroke="#f4f2ee"
            strokeWidth="7.5"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="60"
            strokeDashoffset="60"
            style={{ filter: 'drop-shadow(0 2px 18px rgba(0,0,0,0.6))' }}
          />
          <circle data-dot cx="20" cy="46" r="5.5" fill="#c96442" />
        </svg>
        <span
          data-word
          className="font-mono text-xl font-semibold tracking-tight text-ink opacity-0"
          style={{ textShadow: '0 2px 18px rgba(0,0,0,0.7)' }}
        >
          power<span className="text-accent-soft">/</span>
        </span>
      </div>
    </div>
  );
}
