'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

/**
 * One animation system for the whole page.
 *
 * GSAP rather than a React motion library, and `gsap.from()` rather than
 * `gsap.to()`, for a reason that matters more than it sounds: **`from` animates
 * out of a hidden state into the state the element already has in the DOM.** The
 * markup ships visible. If the script fails, is blocked, or simply never runs,
 * the page reads exactly as it would have — no opacity to restore, nothing to
 * rescue.
 *
 * The alternative — declaring `initial: { opacity: 0 }` and relying on an
 * observer to bring it back — was in this page earlier and hid the entire
 * document below the hero when the observer did not fire. Entrance animations
 * should not be able to become disappearance bugs.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };

/** The page's motion vocabulary. Everything on the page uses these three numbers. */
export const EASE = 'power3.out';
export const DURATION = 0.7;
export const STAGGER = 0.08;

export interface RevealOptions {
  /** Distance travelled, in px. Small — motion should be felt, not watched. */
  y?: number;
  /** Seconds before this element starts. */
  delay?: number;
  /** Gap between children when animating a group. */
  stagger?: number;
  /** Where in the viewport the trigger fires. */
  start?: string;
}

/**
 * Animate one or more elements in on scroll.
 *
 * `gsap.matchMedia` handles the reduced-motion case by simply not registering
 * the animation, which leaves the element in its natural visible state — again,
 * the failure mode is "no animation", never "no content".
 */
export function revealOnScroll(
  targets: gsap.TweenTarget,
  { y = 24, delay = 0, stagger = 0, start = 'top 85%' }: RevealOptions = {},
): gsap.MatchMedia {
  return gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(targets, {
      opacity: 0,
      y,
      duration: DURATION,
      ease: EASE,
      delay,
      stagger,
      scrollTrigger: {
        trigger: targets as gsap.DOMTarget,
        start,
        once: true,
      },
    });
  });
}
