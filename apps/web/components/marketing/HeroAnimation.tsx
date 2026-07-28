'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { PHRASES } from './hero-content';

gsap.registerPlugin(useGSAP, ScrollTrigger, MorphSVGPlugin);

/**
 * The pinned scroll animation, ported from the reference hero.
 *
 * Each phrase rides an SVG path via `textPath`, and the path itself morphs
 * toward a wave in proportion to scroll velocity — flick the wheel and the line
 * ripples, stop and it settles. Over the last stretch the path fades out and the
 * three lines compose statically.
 *
 * This component is loaded only when it should run. `Hero.tsx` renders the
 * composed final state on the server and swaps this in on the client, so the
 * text is in the HTML for crawlers and GSAP never blocks first paint. The two
 * cases where it must not run at all — reduced motion, and small screens where
 * 700vh of scroll-jacking is worse than the static composition — are decided by
 * the parent, which simply does not mount this.
 */

const WAVE_D =
  'M0.21875 190.5C0.21875 190.5 382.004 0.5 644.219 0.5C906.434 0.5 1051.3 78.1239 1288.22 190.5C1531.72 306 1668.87 390.5 1932.22 390.5C2195.57 390.5 2576.22 190.5 2576.22 190.5';
const FLAT_D = 'M0 195H644H1288H1932H2576';

/**
 * Gap between phrases, as a fraction of the path length.
 *
 * The reference alternated text with 300-unit logo images and used a flat 150,
 * which reads as generous when something sits in the gap. With three phrases and
 * nothing between them, 150 units is about 84px on screen: the next phrase
 * arrives before the previous one has left, and the hero opens on
 * "You describe.  A". Spacing by path length instead keeps one phrase on screen
 * at a time at any viewport width.
 */
const SPACING_RATIO = 0.75;

/**
 * When the composed three-line heading takes over, as a fraction of the hero's
 * scroll.
 *
 * The reference resolved at 0.82–1.0, which puts the payoff in the last stride
 * of the section — the composition finishes at the exact moment it starts
 * scrolling out of view, so it is never actually seen finished. Ending at 0.8
 * leaves a full screen of scrolling where the heading simply sits there,
 * complete, before the page moves on.
 */
const FADE_START = 0.58;
const FADE_END = 0.8;

/**
 * When the whole hero fades out, as a fraction of its scroll.
 *
 * Without this the hero is still on screen while the next section scrolls up
 * underneath it, and the two overlap — the heading and the buttons sit on top of
 * the next heading for the last stretch of the section. A hero with its own
 * background hides that; this one is transparent by design, so it has to
 * actually leave. Between `FADE_END` and here the composition simply holds,
 * which is the beat that makes it feel finished rather than interrupted.
 */
const EXIT_START = 0.88;

export interface HeroProgress {
  /** 0 while the moving text owns the screen, 1 once the composition has taken over. */
  composed: number;
  /** 1 while the hero is on screen, 0 once it has cleared for the next section. */
  visible: number;
}

export function HeroAnimation({ onProgress }: { onProgress?: (p: HeroProgress) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const line = lineRef.current;
      if (!line) return;

      const len = line.getTotalLength();
      const segEls = gsap.utils.toArray<SVGTextElement>('.hero-seg', root.current);
      if (segEls.length === 0) return;

      const widthOf = (el: SVGTextElement) => el.getComputedTextLength() || 1800;
      const widths = segEls.map(widthOf);

      // Centre the first phrase in the path so it is legible before any scroll.
      const spacing = len * SPACING_RATIO;
      const base = Math.max(40, (len - widths[0]!) / 2);
      const starts: number[] = [];
      segEls.forEach((_, i) => {
        starts[i] = i === 0 ? base : starts[i - 1]! + widths[i - 1]! + spacing;
      });
      // Scale the travel so the last phrase has cleared the path exactly as the
      // cross-fade completes. Otherwise text is still sliding underneath a
      // heading that has already faded in on top of it.
      const last = segEls.length - 1;
      const travel = starts[last]! + widths[last]! + len * 0.08;
      const headEnd = travel / FADE_END;

      const morphTween = gsap.to(line, {
        duration: 1,
        ease: 'none',
        paused: true,
        morphSVG: { shape: WAVE_D },
      });

      let head = 0;
      let prog = 0;
      let morphTarget = 0;
      let morphCurrent = 0;
      const clamp01 = gsap.utils.clamp(0, 1);

      const render = () => {
        // Ease toward the velocity-driven target, and bleed that target away so
        // the line relaxes to flat whenever scrolling stops.
        morphCurrent += (morphTarget - morphCurrent) * 0.12;
        morphTarget *= 0.92;
        if (morphCurrent < 0.0002) morphCurrent = 0;
        morphTween.progress(morphCurrent);

        segEls.forEach((el, i) => {
          const left = starts[i]! - head;
          const onPath = left <= len && left >= -widths[i]! - 50;
          const tp = el.querySelector('textPath');
          if (tp) tp.setAttribute('startOffset', String(left));
          el.style.opacity = onPath ? '1' : '0';
        });

        // Hand over to the parent, which cross-fades to the static composition
        // that was server-rendered and then clears the hero out of the way.
        const fade = clamp01((prog - FADE_START) / (FADE_END - FADE_START));
        if (svgRef.current) svgRef.current.style.opacity = String(1 - fade);
        onProgress?.({
          composed: fade,
          visible: 1 - clamp01((prog - EXIT_START) / (1 - EXIT_START)),
        });
      };

      gsap.ticker.add(render);

      // No `pin`. The hero is held in place by `position: sticky` in Hero.tsx —
      // ScrollTrigger's pinning rewrites the DOM to do the same job, and those
      // rewrites are a layout-shift source on a page whose CLS budget is the
      // thing being protected. This scrubs against the section's own scroll
      // range and touches nothing but the SVG.
      const st = ScrollTrigger.create({
        trigger: root.current?.closest('[data-hero]') ?? root.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          prog = self.progress;
          head = prog * headEnd;
          morphTarget = Math.min(1, Math.abs(self.getVelocity()) / 1500);
        },
      });

      render();

      return () => {
        gsap.ticker.remove(render);
        st.kill();
      };
    },
    { scope: root },
  );

  // Absolutely positioned inside the hero's sticky container: it overlays the
  // composed heading and contributes no height of its own, so mounting it after
  // hydration cannot move anything.
  return (
    <div ref={root} aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox="0 -130 2577 651"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        className="w-full"
        style={{ height: 'auto', overflow: 'visible' }}
      >
        <path id="hero-line" ref={lineRef} d={FLAT_D} fill="none" />
        <g>
          {PHRASES.map((phrase) => (
            <text
              key={phrase}
              className="hero-seg"
              fill="#191817"
              fontSize="300"
              dominantBaseline="middle"
              style={{ opacity: 0 }}
            >
              <textPath href="#hero-line" startOffset="0">
                {phrase}
              </textPath>
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * True when the animation should run at all.
 *
 * Both exclusions are deliberate. Reduced motion is a stated preference and a
 * 700vh scroll-jack is exactly what it is asking us not to do. The width check
 * is a judgement: on a phone the pinned sequence is a long, unskippable scroll
 * before any content, and the static composition is simply better there.
 */
export function useAnimatedHero(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wideQuery = window.matchMedia('(min-width: 768px)');
    const update = () => setEnabled(!motionQuery.matches && wideQuery.matches);

    update();
    motionQuery.addEventListener('change', update);
    wideQuery.addEventListener('change', update);
    return () => {
      motionQuery.removeEventListener('change', update);
      wideQuery.removeEventListener('change', update);
    };
  }, []);

  return enabled;
}
