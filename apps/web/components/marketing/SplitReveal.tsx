'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { gsap, useGSAP } from '@/lib/motion';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * Headings that rise into view from behind their own baseline.
 *
 * Each line is wrapped in an overflow-hidden box and animated up from below it,
 * so the type is revealed by a moving edge rather than by fading. On a
 * high-contrast serif that difference is most of the character of the page: a
 * fade makes text arrive already there, whereas a masked rise makes it arrive
 * *from* somewhere, which is what gives an editorial layout its weight.
 *
 * Three properties keep it safe:
 *
 *   - `gsap.from()` again, so the markup ships visible. `SplitText` only runs
 *     after mount, and if it never runs the heading is an ordinary heading.
 *   - `revert()` on cleanup puts the original nodes back, so React never sees
 *     the split DOM and a re-render cannot fight it.
 *   - Under reduced motion nothing is registered and nothing is split — the
 *     text is never even divided into lines, which also keeps it intact for
 *     anything reading the DOM.
 *
 * Splitting happens on the client only. The server renders the plain heading,
 * which is what a crawler sees and what makes this safe for SEO.
 */
export function SplitReveal({
  children,
  className,
  as: Tag = 'h2',
  delay = 0,
  stagger = 0.09,
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number;
  stagger?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const split = new SplitText(el, {
          type: 'lines',
          linesClass: 'split-line',
          // Each line gets its own overflow-hidden parent to mask against.
          mask: 'lines',
        });

        gsap.from(split.lines, {
          yPercent: 115,
          duration: 0.9,
          ease: 'power4.out',
          stagger,
          delay,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });

        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
