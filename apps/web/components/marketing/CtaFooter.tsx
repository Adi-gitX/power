import { Reveal } from './Reveal';
import { CopyButton } from './Code';
import { INSTALL, SITE } from '@/lib/site';

export function CtaFooter() {
  return (
    <footer>
      {/*
        A hairline above and the page's own glow below — no panel, no image, no
        colour change. The call to action reads as the end of one surface rather
        than as a band stuck onto it.
      */}
      <div className="relative border-t border-hairline">
        <div className="relative mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-36">
          <Reveal className="mx-auto flex max-w-xl flex-col items-center [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
            <h2 className="display text-4xl leading-[1.06] text-ink sm:text-5xl">
              Point it at something and walk away.
            </h2>
            <p className="mt-4 text-base text-mutedtext sm:text-lg">
              Two commands, and the session you already have open.
            </p>

            <div className="mt-8 w-full rounded-2xl border border-hairline bg-sunken p-3 text-left backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3 px-2 pt-1.5">
                <pre className="overflow-x-auto font-mono text-[13px] leading-relaxed text-ink/90">
                  <code>{INSTALL.both}</code>
                </pre>
                <CopyButton text={INSTALL.both} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-8">
        <span className="text-sm text-mutedtext">
          © {new Date().getFullYear()} {SITE.name}
        </span>
        <div className="flex items-center gap-6">
          <a href={SITE.docs} className="text-sm text-mutedtext transition-colors hover:text-ink">
            Docs
          </a>
          <a href={SITE.repo} className="text-sm text-mutedtext transition-colors hover:text-ink">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
