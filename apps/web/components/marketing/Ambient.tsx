'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion';

/**
 * Parallax on the page's ambient light.
 *
 * The wash itself lives in `body::before` and is fixed to the viewport, which is
 * what keeps the page seamless — no section owns it, so no boundary between
 * sections is ever visible. The cost of fixing it is that it becomes completely
 * static, and a large flat gradient that never moves reads as a painted
 * backdrop.
 *
 * This drifts it a little against the scroll. A pseudo-element cannot be
 * targeted from JavaScript, so the movement goes through a custom property the
 * gradient's position is expressed in. Fifty pixels over the whole document —
 * far too little to notice directly, just enough that the light feels like it
 * belongs to a space rather than to the page.
 *
 * Renders nothing.
 */
export function Ambient() {
  const done = useRef(false);

  useGSAP(() => {
    if (done.current) return;
    done.current = true;

    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      const tween = gsap.to(document.documentElement, {
        '--ambient-shift': '50px',
        ease: 'none',
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2,
        },
      });
      return () => tween.kill();
    });
  }, []);

  return null;
}
