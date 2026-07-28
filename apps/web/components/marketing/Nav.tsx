'use client';

import { useEffect, useState } from 'react';
import { InkButton } from './Buttons';
import { SITE } from '@/lib/site';

/**
 * Transparent over the dark hero, then paper with a hairline once past it —
 * ported from the reference. Watching the hero's own height rather than a fixed
 * scroll offset keeps the swap correct when the hero changes height, which it
 * does: the animated hero is 700vh and the static one is a single screen.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('top');
      if (!hero) return;
      setScrolled(window.scrollY > hero.offsetTop + hero.offsetHeight - 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'border-b border-hairline bg-canvas/85 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        {/* The canvas is the same colour behind and below the hero, so the
            wordmark needs no colour swap — only the bar's own surface changes. */}
        <a
          href="#top"
          aria-label={`${SITE.name} home`}
          className="font-mono text-base font-semibold tracking-tight text-ink"
        >
          {SITE.name.toLowerCase()}
          <span className="text-accent">/</span>
        </a>
        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href={SITE.repo}
            className="text-sm font-medium text-mutedtext transition-colors hover:text-ink"
          >
            GitHub
          </a>
          <InkButton as="a" href="#install">
            Install
          </InkButton>
        </div>
      </nav>
    </header>
  );
}
