'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/motion';
import { InkButton } from './Buttons';
import { SITE } from '@/lib/site';

/**
 * The mark from `app/icon.svg`, inline so it inherits colour and costs no
 * request. One thick diagonal and an accent dot — the same shape the browser tab
 * shows, which is most of what makes a small brand feel like one thing.
 */
function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path
        d="M40.5 14 L29 50"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="46" r="5.5" className="fill-accent" />
    </svg>
  );
}

const LINKS = [
  { href: '#why', label: 'Why Power' },
  { href: '#how', label: 'How it works' },
  { href: '#capabilities', label: 'Capabilities' },
  { href: '#faq', label: 'FAQ' },
] as const;

/**
 * A nav that changes shape rather than just colour.
 *
 * At rest it is a full-width bar over the hero with no surface of its own — on a
 * seamless page, a bar with a border at the very top is a seam. Once you leave
 * the hero it contracts into a floating capsule: narrower, detached from the
 * edge, blurred, with a hairline and a shadow soft enough to read as lift rather
 * than as a box. The contraction is what signals "you are reading now"; a
 * background swap alone does not.
 *
 * The section links carry a sliding pill driven by scroll position, so the nav
 * always answers "where am I" without being asked. That indicator uses the same
 * GSAP tween as the tabs further down the page, which is why the two feel
 * related rather than merely coexisting.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');
  const [open, setOpen] = useState(false);

  const linkbar = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // Contract once past the hero. Measuring the hero rather than a fixed offset
  // keeps this correct across its two very different heights — 320vh when the
  // scroll animation runs, one screen when it does not.
  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById('top');
      setScrolled(window.scrollY > (hero ? hero.offsetHeight - 120 : 80));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy. One trigger per section, reporting whichever is currently
  // crossing the middle of the viewport.
  useGSAP(() => {
    const triggers = LINKS.map(({ href }) => {
      const el = document.querySelector(href);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => self.isActive && setActive(href),
      });
    }).filter(Boolean) as ScrollTrigger[];
    return () => triggers.forEach((t) => t.kill());
  }, []);

  // Slide the pill under the active link. It is hidden entirely when nothing is
  // active, so it never sits under a link you are not reading.
  useGSAP(
    () => {
      const el = linkbar.current?.querySelector<HTMLElement>(`[data-href="${active}"]`);
      if (!pill.current) return;
      if (!el) {
        gsap.to(pill.current, { opacity: 0, duration: 0.2 });
        return;
      }
      gsap.to(pill.current, {
        x: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1,
        duration: 0.42,
        ease: 'power3.out',
      });
    },
    { dependencies: [active, scrolled], scope: linkbar },
  );

  // Mobile panel: escape closes it and focus goes back to the button that
  // opened it, which is the minimum for a disclosure not to trap someone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !menuButton.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  useGSAP(
    () => {
      if (!panel.current) return;
      gsap.fromTo(
        panel.current,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' },
      );
    },
    { dependencies: [open], scope: panel },
  );

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 sm:px-6">
      <nav
        aria-label="Main"
        className={`mx-auto flex items-center justify-between transition-all duration-500 ease-out ${
          scrolled
            ? 'mt-3 max-w-3xl rounded-full border border-hairline bg-canvas/75 py-2 pr-2 pl-4 shadow-[0_1px_2px_rgba(25,24,23,0.04),0_10px_30px_-12px_rgba(25,24,23,0.18)] backdrop-blur-xl'
            : 'mt-0 max-w-6xl rounded-none border border-transparent bg-transparent py-3 pr-0 pl-1 shadow-none backdrop-blur-none'
        }`}
      >
        <a
          href="#top"
          aria-label={`${SITE.name} home`}
          className="flex shrink-0 items-center gap-2 text-ink"
        >
          <Mark className="h-[22px] w-[22px]" />
          <span className="font-mono text-base font-semibold tracking-tight">
            {SITE.name.toLowerCase()}
          </span>
        </a>

        {/* Section links. Desktop only — on a phone these live in the panel. */}
        <div ref={linkbar} className="relative hidden items-center gap-1 md:flex">
          <span
            ref={pill}
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-0 rounded-full bg-sunken opacity-0"
          />
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-href={link.href}
              aria-current={active === link.href ? 'true' : undefined}
              className={`relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active === link.href ? 'text-ink' : 'text-mutedtext hover:text-ink'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href={SITE.repo}
            className="hidden text-sm font-medium text-mutedtext transition-colors hover:text-ink sm:block"
          >
            GitHub
          </a>
          <InkButton as="a" href="#install" className="hidden rounded-full sm:inline-flex">
            Install
          </InkButton>

          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="nav-panel"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 place-items-center rounded-full border border-hairline bg-surface text-ink transition-colors hover:border-mutedtext/50 md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          ref={panel}
          id="nav-panel"
          className="mx-auto mt-2 max-w-3xl rounded-2xl border border-hairline bg-canvas p-2 shadow-[0_10px_40px_-12px_rgba(25,24,23,0.28)] md:hidden"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-bodytext transition-colors hover:bg-sunken hover:text-ink"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-1 border-t border-hairline pt-2">
            <a
              href={SITE.repo}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm font-medium text-bodytext transition-colors hover:bg-sunken hover:text-ink"
            >
              GitHub
            </a>
            <InkButton
              as="a"
              href="#install"
              onClick={() => setOpen(false)}
              className="mt-1 w-full rounded-xl"
            >
              Install
            </InkButton>
          </div>
        </div>
      )}
    </header>
  );
}
