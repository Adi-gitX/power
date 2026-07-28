import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * The launch story.
 *
 * The window is transparent, so the whole first act plays directly over the
 * user's desktop: the mark draws itself to a chime, and then the product's
 * three-line story — the same three lines the website opens with — speaks in
 * sequence before the app surface exists at all. Then everything lifts, and the
 * surface breathes in underneath. One narrative from desktop to app.
 *
 * Two disciplines keep the theatre honest. It is **skippable** — any key or
 * click jumps straight to the app, because an intro that holds the user hostage
 * on the fortieth launch is not delight, it is a toll. And under reduced motion
 * none of it runs: no sound, no story, the app simply appears.
 *
 * The chime is synthesized (three sine partials, bell envelope) so the app
 * ships no audio asset.
 */
const STORY = ['You describe.', 'Agents build.', 'Gates decide.'];

function chime(): void {
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
    for (const [freq, delay, level] of [
      [523.25, 0, 1],
      [783.99, 0.09, 0.55],
      [1567.98, 0.09, 0.18],
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
    /* silent is fine */
  }
}

/** A soft tick as each story line lands — much quieter than the opening bell. */
function tick(note: number): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = note;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.55);
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* silent is fine */
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

    // Act 1 — the mark, alone on the desktop.
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
      // Act 2 — the story speaks, one line at a time, each rising from its mask.
      .to(q('[data-mark]'), { y: -46, scale: 0.72, duration: 0.5, ease: 'power2.inOut' }, '+=0.35');

    STORY.forEach((_, i) => {
      tl.fromTo(
        q(`[data-line="${i}"]`),
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 0.55,
          ease: 'power3.out',
          onStart: () => tick(659.25 + i * 130),
        },
        i === 0 ? '-=0.1' : '+=0.28',
      );
    });

    // Act 3 — the story yields; the app arrives.
    tl.to(q('[data-story]'), { opacity: 0, y: -14, duration: 0.4, ease: 'power2.in' }, '+=0.75')
      .to(q('[data-mark]'), { opacity: 0, duration: 0.35, ease: 'power2.in' }, '<')
      .to(root.current, { opacity: 0, duration: 0.3 }, '-=0.1');

    // Skippable: any interaction jumps to the end state.
    const skip = () => tl.progress(1);
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [onDone]);

  return (
    <div ref={root} className="absolute inset-0 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div data-mark>
          <svg width="96" height="96" viewBox="0 0 64 64" aria-hidden="true">
            <path
              data-slash
              d="M40.5 14 L29 50"
              stroke="#f4f2ee"
              strokeWidth="7.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="60"
              strokeDashoffset="60"
              style={{ filter: 'drop-shadow(0 2px 20px rgba(0,0,0,0.65))' }}
            />
            <circle
              data-dot
              cx="20"
              cy="46"
              r="5.5"
              fill="#c96442"
              style={{ filter: 'drop-shadow(0 2px 14px rgba(0,0,0,0.5))' }}
            />
          </svg>
        </div>
        <div data-story className="mt-2 flex flex-col items-center gap-1">
          {STORY.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.1em]">
              <span
                data-line={i}
                className="display block text-4xl text-ink"
                style={{ textShadow: '0 2px 22px rgba(0,0,0,0.75)' }}
              >
                {line}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
