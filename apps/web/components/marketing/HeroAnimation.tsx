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
 * The reference implementation's numbers, kept verbatim by request.
 *
 * `SPACING` is the flat 150-unit gap the reference puts between segments on the
 * path, so the phrases run as one continuous train the way its text-logo-text
 * sequence did. The composed reveal owns the final 18% of the scroll
 * (`FADE_START = 0.82`), each line starting `STAGGER_PER_LINE` into the fade and
 * resolving over a `LINE_WINDOW`, rising `LINE_RISE_PX` as it arrives — all four
 * values lifted directly from the reference's final-reveal loop.
 *
 * The overlap bug fixed earlier is not reintroduced by returning to the
 * reference timing. That bug came from *my* re-timing, which started the
 * composition at mid-scroll while phrases were still mid-sweep. In the
 * reference geometry the travel distance includes a `len * 0.3` tail, so by
 * 0.82 the last phrase has left the path and the cross-fade happens over an
 * essentially empty stage.
 */
const SPACING = 150;
const FADE_START = 0.82;
const FADE_WINDOW = 0.18;
const STAGGER_PER_LINE = 0.13;
const LINE_WINDOW = 0.45;
export const LINE_RISE_PX = 22;

export interface HeroProgress {
  /**
   * Per-line opacity for the composed reveal, computed with the reference's own
   * stagger so the parent applies exactly the effect it shipped: line i starts
   * at `i * STAGGER_PER_LINE` into the fade and resolves over `LINE_WINDOW`.
   */
  lines: number[];
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

      // The reference's layout, verbatim: centre the opening phrase, then chain
      // the rest at a flat gap, with a len*0.3 tail so the train fully clears
      // the path before the reveal window opens.
      const base = Math.max(40, (len - widths[0]!) / 2);
      const starts: number[] = [];
      segEls.forEach((_, i) => {
        starts[i] = i === 0 ? base : starts[i - 1]! + widths[i - 1]! + SPACING;
      });
      const last = segEls.length - 1;
      const headEnd = starts[last]! + widths[last]! + len * 0.3;

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

        // The reference's final reveal: the path fades over the last 18% while
        // each composed line resolves on its own staggered sub-window.
        const fade = clamp01((prog - FADE_START) / FADE_WINDOW);
        if (svgRef.current) svgRef.current.style.opacity = String(1 - fade);
        onProgress?.({
          lines: segEls.map((_, i) =>
            clamp01((fade - i * STAGGER_PER_LINE) / LINE_WINDOW),
          ),
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
