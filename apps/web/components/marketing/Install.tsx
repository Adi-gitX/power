'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/motion';
import { Reveal } from './Reveal';
import { CodeBlock, CopyButton, StepList } from './Code';
import { COMMANDS, INSTALL } from '@/lib/site';

/**
 * The call to action. Ported from the reference's tabbed connect section, with
 * the tabs being Power's four commands — so the section that tells you how to
 * get it also shows you the whole surface of what you get.
 */
export function Install() {
  const [active, setActive] = useState(COMMANDS[0]!.id);
  const current = COMMANDS.find((c) => c.id === active)!;
  const tablist = useRef<HTMLDivElement>(null);
  const underline = useRef<HTMLSpanElement>(null);

  // Slide the underline to the selected tab. framer-motion's `layoutId` did this
  // for free, but it was the only thing that library was still being loaded for;
  // measuring two offsets is a cheap trade for dropping the dependency.
  useGSAP(
    () => {
      const tab = tablist.current?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!tab || !underline.current) return;
      gsap.to(underline.current, {
        x: tab.offsetLeft,
        width: tab.offsetWidth,
        duration: 0.42,
        ease: 'power3.out',
      });
    },
    { dependencies: [active], scope: tablist },
  );

  return (
    <section id="install" className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
      <Reveal>
        <h2 className="display text-3xl text-ink sm:text-[2.6rem]">
          Install it in a minute
        </h2>
        <p className="mt-3 text-base text-mutedtext">
          Power runs on the Claude Code session you already have. There is no API key and
          nothing to deploy.
        </p>
      </Reveal>

      <Reveal delay={0.04} className="mx-auto mt-8 max-w-2xl text-left">
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-hairline bg-surface px-4 py-3">
          <div className="min-w-0">
            <span className="block text-xs text-mutedtext">Run once, in any session</span>
            <code className="block truncate font-mono text-sm text-ink">
              {INSTALL.marketplace}
            </code>
            <code className="block truncate font-mono text-sm text-ink">{INSTALL.install}</code>
          </div>
          <CopyButton text={INSTALL.both} dark={false} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-mutedtext">
          The gates and the state machine are real code, so install the workspace
          dependencies first with{' '}
          <code className="font-mono text-[13px] text-ink">{INSTALL.deps}</code>.
        </p>
      </Reveal>

      <Reveal delay={0.08} className="mt-10">
        <div
          ref={tablist}
          role="tablist"
          aria-label="Power commands"
          className="relative flex flex-wrap justify-center gap-1 border-b border-hairline"
        >
          <span
            ref={underline}
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-accent"
          />
          {COMMANDS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActive(tab.id)}
                className={`relative px-4 py-3 font-mono text-sm font-medium transition-colors sm:px-5 ${
                  isActive ? 'text-ink' : 'text-mutedtext hover:text-ink'
                }`}
              >
                /power {tab.label}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          className="mx-auto mt-8 max-w-2xl rounded-[10px] border border-hairline bg-surface p-6 text-left sm:p-8"
        >
          <div key={active} className="tab-fade">
            <p className="text-base leading-relaxed font-semibold text-ink">{current.blurb}</p>
            <CodeBlock code={current.command} label="claude code" />
            <p className="mt-4 text-sm leading-relaxed text-mutedtext">{current.detail}</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.12} className="mx-auto mt-10 max-w-2xl text-left">
        <p className="mb-3 text-sm font-semibold text-ink">What a run does, in order</p>
        <div className="rounded-[10px] border border-hairline bg-surface p-6 sm:p-8">
          <StepList
            steps={[
              'Compiles your sentence into a brief and a gradeable rubric',
              'Researches the unknowns — every claim carries a source',
              'Writes a spec with one testable criterion per requirement',
              'Asks you to approve it. This is the only time it waits',
              'Implements, then reviews and tests concurrently',
              'Verifies with a fresh agent that has no memory of the build',
              'Documents what the code does, flagging where it diverges from the spec',
            ]}
          />
        </div>
      </Reveal>
    </section>
  );
}
