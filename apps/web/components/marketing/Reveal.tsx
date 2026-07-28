'use client';

import { useRef, type ReactNode } from 'react';
import { gsap, useGSAP, DURATION, EASE } from '@/lib/motion';

/**
 * Scroll reveal.
 *
 * The element renders visible and GSAP animates it *from* a hidden state, so a
 * failed or blocked script leaves a perfectly readable page rather than a blank
 * one. Under reduced motion `matchMedia` never registers the tween and the
 * element is simply already where it belongs.
 *
 * `once: true` matters for feel: re-animating on every scroll past is what makes
 * a page feel restless. Firing at `top 85%` starts it just before the element is
 * fully in view, so it reads as settling rather than as waiting to be looked at.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(ref.current, {
          opacity: 0,
          y,
          duration: DURATION,
          ease: EASE,
          delay,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * Reveal a group of children in sequence.
 *
 * A stagger is worth the extra component because a grid of six cards arriving at
 * once reads as a single block appearing, while the same cards 80ms apart read
 * as a list being laid down. The content is identical; only the second one has
 * a direction.
 */
export function RevealGroup({
  children,
  className,
  selector = ':scope > *',
  stagger = 0.08,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  selector?: string;
  stagger?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const items = ref.current?.querySelectorAll(selector);
        if (!items?.length) return;
        gsap.from(items, {
          opacity: 0,
          y,
          duration: DURATION,
          ease: EASE,
          stagger,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
