import { Reveal } from './Reveal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { SITE } from '@/lib/site';

/**
 * Answers, including the unflattering ones. The last two exist because a reader
 * deciding whether to run this on their repository deserves the limitations
 * before they install, not after.
 */
const FAQS = [
  {
    q: 'Do I need an API key?',
    a: (
      <>
        No. Power runs inside the Claude Code session you already have, using its
        authentication. There is no key to manage, nothing to deploy, and no separate
        service holding your credentials.
      </>
    ),
  },
  {
    q: 'What happens when a gate fails?',
    a: (
      <>
        The stage does not pass, whatever the agent that produced it claimed. Power
        re-dispatches the responsible agent with the exact rule that failed. Each
        feedback edge allows two retries; on the third the run blocks and reports which
        rule it could not satisfy, rather than trying a fourth time.
      </>
    ),
  },
  {
    q: 'Will it edit my repository?',
    a: (
      <>
        Yes — the implementer, tester, and documenter write real code. Power will not
        commit or push unless you ask. It checks for uncommitted changes before starting
        and stops if the working tree is dirty, so its work is always separable from
        yours.
      </>
    ),
  },
  {
    q: 'How is this different from just asking Claude Code to build something?',
    a: (
      <>
        Mostly in what happens after the code exists. A single agent reports its own
        success. Power routes each stage through a validator that runs as code over the
        files on disk, gives the reviewer and verifier no ability to edit what they judge,
        and caps every retry loop. You are checking a result, not supervising a process.
      </>
    ),
  },
  {
    q: 'What does it not do?',
    a: (
      <>
        It does not deploy, and it will not ship past its own guardrail: shipping requires
        an approved spec, green self-checks, and a passed verification gate together. In
        the plugin, single-writer artifact ownership rests on each agent&rsquo;s rules
        rather than being structurally enforced. The{' '}
        <a href={SITE.docs} className="text-brandblue hover:underline">
          README
        </a>{' '}
        lists the current limitations in full.
      </>
    ),
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 sm:px-8">
      <Reveal>
        <h2 className="text-center display text-3xl text-ink sm:text-[2.6rem]">
          Frequently asked questions
        </h2>
      </Reveal>

      <Reveal delay={0.06} className="mt-8">
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-hairline">
              <AccordionTrigger className="py-5 text-base font-semibold text-ink hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pr-6 pb-5 text-base leading-relaxed text-bodytext">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}
