'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion';
import { SplitReveal } from './SplitReveal';
import { Reveal } from './Reveal';

/**
 * A run, shown rather than described.
 *
 * Everything else on this page makes claims: gates run as code, retries are
 * counted, you are asked once. This is the only place a reader can watch those
 * three things actually happen — and it is the argument, because the interesting
 * part of the product is not that it writes code, it is what it does when the
 * code is wrong.
 *
 * So the sequence deliberately fails. The review stage finds two defects, takes
 * a counted retry, and only then goes green. A demo that runs clean end to end
 * would be prettier and would skip the entire point.
 *
 * The content is honest about the product: these are the real stage names, the
 * real gate names, and the real retry cap.
 */

type Line =
  | { kind: 'command'; text: string }
  | { kind: 'blank' }
  | { kind: 'stage'; name: string; detail: string; gate?: 'PASS' | 'FAIL' }
  | { kind: 'retry'; text: string }
  | { kind: 'ask'; text: string }
  | { kind: 'done'; text: string };

const LINES: Line[] = [
  { kind: 'command', text: '/power build "a rate-limited URL shortener with tests"' },
  { kind: 'blank' },
  { kind: 'stage', name: 'research', detail: '9 sources, every claim cited', gate: 'PASS' },
  { kind: 'stage', name: 'spec', detail: '7 requirements · 14 EARS criteria', gate: 'PASS' },
  { kind: 'ask', text: 'approve the spec?  → approved' },
  { kind: 'stage', name: 'implement', detail: '14 files, self-check green' },
  { kind: 'stage', name: 'review', detail: '2 high findings', gate: 'FAIL' },
  { kind: 'retry', text: 'needs_fixes 1/2 — re-dispatching implementer with the findings' },
  { kind: 'stage', name: 'implement', detail: '2 fixes' },
  { kind: 'stage', name: 'test', detail: '31 passing, 0 failing' },
  { kind: 'stage', name: 'verify', detail: 'every P0 exercised by interaction', gate: 'PASS' },
  { kind: 'stage', name: 'document', detail: 'README, 3 ADRs, 1 divergence flagged' },
  { kind: 'blank' },
  { kind: 'done', text: 'done · 1 approval asked · 1 of 2 retries used' },
];

function Gate({ verdict }: { verdict: 'PASS' | 'FAIL' }) {
  const pass = verdict === 'PASS';
  return (
    <span
      data-gate
      className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide ${
        pass
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          : 'border-accent-soft/40 bg-accent-soft/10 text-accent-soft'
      }`}
    >
      <span aria-hidden="true">{pass ? '✓' : '✕'}</span>
      gate {verdict}
    </span>
  );
}

export function RunLog() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const rows = ref.current!.querySelectorAll('[data-row]');
        const gates = ref.current!.querySelectorAll('[data-gate]');
        const caret = ref.current!.querySelector('[data-caret]');

        const tl = gsap.timeline({
          scrollTrigger: { trigger: ref.current, start: 'top 72%', once: true },
        });

        // Lines arrive in order, as a log fills.
        tl.from(rows, { opacity: 0, y: 6, duration: 0.32, ease: 'power2.out', stagger: 0.11 });

        // Each verdict lands after its line, with a small overshoot — the stamp
        // is the moment that matters, so it gets its own beat.
        gates.forEach((g) => {
          tl.from(
            g,
            { opacity: 0, scale: 0.82, duration: 0.3, ease: 'back.out(2.4)' },
            '<0.06',
          );
        });

        if (caret) {
          tl.to(caret, { opacity: 0, duration: 0.45, repeat: -1, yoyo: true, ease: 'none' }, 0);
        }
      });
    },
    { scope: ref },
  );

  return (
    <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
      <div className="text-center">
        <SplitReveal className="mx-auto max-w-2xl display text-3xl text-ink sm:text-[2.6rem]">
          What it looks like when something is wrong
        </SplitReveal>
        <Reveal delay={0.06}>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-mutedtext">
            Any tool can show you a run that worked. This is the review stage failing, a
            retry being counted, and the run continuing — which is the part you are
            actually trusting.
          </p>
        </Reveal>
      </div>

      <Reveal delay={0.1} className="mt-12">
        <div
          ref={ref}
          className="overflow-hidden rounded-[14px] border border-hairline bg-code shadow-[0_20px_50px_-24px_rgba(25,24,23,0.45)]"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
            <span className="ml-2 font-mono text-[11px] text-white/35">claude code</span>
          </div>

          <div className="overflow-x-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed sm:px-6 sm:py-5 sm:text-[13px]">
            {LINES.map((line, i) => {
              if (line.kind === 'blank') return <div key={i} data-row className="h-3" />;

              if (line.kind === 'command') {
                return (
                  <div key={i} data-row className="flex gap-2 whitespace-nowrap text-white/90">
                    <span className="text-accent-soft">$</span>
                    <span>{line.text}</span>
                    <span data-caret className="text-white/70" aria-hidden="true">
                      ▋
                    </span>
                  </div>
                );
              }

              if (line.kind === 'retry') {
                return (
                  <div key={i} data-row className="flex gap-2 py-0.5 text-accent-soft">
                    <span aria-hidden="true">↻</span>
                    <span>{line.text}</span>
                  </div>
                );
              }

              if (line.kind === 'ask') {
                return (
                  <div key={i} data-row className="flex gap-2 py-0.5 text-white/70">
                    <span aria-hidden="true">?</span>
                    <span>{line.text}</span>
                  </div>
                );
              }

              if (line.kind === 'done') {
                return (
                  <div key={i} data-row className="flex gap-2 text-emerald-300/90">
                    <span aria-hidden="true">✓</span>
                    <span>{line.text}</span>
                  </div>
                );
              }

              return (
                <div key={i} data-row className="flex items-center gap-3 py-0.5">
                  <span className="w-[4.75rem] shrink-0 text-white/85">{line.name}</span>
                  <span className="truncate text-white/45">{line.detail}</span>
                  {line.gate && <Gate verdict={line.gate} />}
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
