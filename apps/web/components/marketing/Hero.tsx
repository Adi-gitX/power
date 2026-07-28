'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { GhostButton, PaperButton } from './Buttons';
import { PHRASES } from './hero-content';
import { useAnimatedHero, type HeroProgress } from './HeroAnimation';
import { SITE } from '@/lib/site';

/**
 * GSAP and its two plugins are ~60KB that nothing above the fold needs. Loading
 * them lazily means first paint is the static composition — which is also what
 * every crawler and every reduced-motion visitor gets, so the fast path and the
 * accessible path are the same path.
 */
const HeroAnimation = dynamic(
  () => import('./HeroAnimation').then((m) => ({ default: m.HeroAnimation })),
  { ssr: false },
);

/**
 * **Layout here is decided by CSS, never by JavaScript.** That is the whole
 * shape of this component and it is worth stating plainly, because the obvious
 * alternative is a trap.
 *
 * The obvious version renders a one-screen hero on the server and swaps in the
 * tall scroll container after hydration, once it knows whether to animate. That
 * works, looks fine, and scored a Cumulative Layout Shift of 1.43 — roughly
 * fourteen times the threshold Google treats as poor, on the one metric a
 * marketing page cannot afford to fail.
 *
 * So the height comes from a media query (`md:h-[700vh]`), which the browser
 * resolves before the first paint. The tall scroll region exists from the start
 * on desktop and never exists on mobile. Hydration adds behaviour and changes no
 * geometry.
 *
 * The pin is `position: sticky` rather than a GSAP pin, for the same reason:
 * ScrollTrigger's pinning rewrites the DOM to hold an element in place, and
 * every one of those rewrites is a chance to shift the page. Sticky is a native
 * one-line answer to exactly this problem, so GSAP is left to do only the thing
 * CSS cannot — move the text along the path and morph it.
 */
export function Hero() {
  const animated = useAnimatedHero();
  const [progress, setProgress] = useState<HeroProgress>({ composed: 1, visible: 1 });
  const composed = animated ? progress.composed : 1;
  const visible = animated ? progress.visible : 1;

  return (
    <section
      id="top"
      data-hero=""
      // No background of its own. The page's ambient glow shows through, so the
      // hero and everything after it are one uninterrupted surface — a photo
      // here would put a hard edge exactly where the seam must not be.
      // 320vh, not the reference's 700vh. That number was tuned for a sequence
      // with images interleaved between the phrases; with three short lines and
      // nothing else, seven screens of scroll-jacking to read nine words is a
      // reason to leave rather than an effect. Three screens is enough to carry
      // the phrases across and still let the composed heading hold at the end.
      className="relative min-h-screen text-ink md:h-[320vh]"
    >
      <div
        className="sticky top-0 flex h-screen items-center justify-center overflow-hidden"
        style={{ opacity: visible }}
      >
        {animated && <HeroAnimation onProgress={setProgress} />}

        {/*
          The real heading, always in the DOM and always in the same place. When
          the animation runs it fades up as the moving text resolves; otherwise
          it simply is the hero. Either way this is the markup a crawler indexes.
        */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
          style={{ opacity: animated ? composed : 1 }}
        >
          <div className="flex flex-col items-start gap-3 sm:gap-4">
            <h1 className="sr-only">
              {SITE.name} — {SITE.tagline}
            </h1>
            {PHRASES.map((phrase) => (
              <p
                key={phrase}
                aria-hidden="true"
                className="display text-5xl leading-[1.05] text-ink sm:text-7xl lg:text-[5.5rem]"
              >
                {phrase}
              </p>
            ))}
          </div>
        </div>

        {/*
          Subhead and calls to action, always at full opacity — deliberately not
          tied to the animation's progress. Fading these in with the heading
          would mean the page opens with no call to action at all and does not
          get one until several screens of scrolling have happened.
        */}
        <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-5 px-5 sm:bottom-14">
          <p className="max-w-md text-center text-sm leading-relaxed text-mutedtext sm:text-base">
            {SITE.tagline} Eight specialists, gates that run as code, and one place you
            are asked to decide anything.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <PaperButton as="a" href="#install">
              Install it
            </PaperButton>
            <GhostButton as="a" href={SITE.docs}>
              Read the docs
            </GhostButton>
          </div>
        </div>
      </div>
    </section>
  );
}
