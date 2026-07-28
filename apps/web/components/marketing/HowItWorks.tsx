import { SplitReveal } from './SplitReveal';
import { Reveal, RevealGroup } from './Reveal';

const STEPS = [
  {
    n: '1',
    title: 'Install',
    body: 'Two commands, once. It runs on the Claude Code session you already have — no API key to manage.',
  },
  {
    n: '2',
    title: 'Describe',
    body: 'One sentence about what you want. Power compiles it into a brief and a rubric you can read before anything starts.',
  },
  {
    n: '3',
    title: 'Approve the spec',
    body: 'The only decision asked of you. Everything after it runs unattended, and stops on its own if a gate will not pass.',
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
      <Reveal>
        <SplitReveal className="mx-auto max-w-2xl display text-3xl text-ink sm:text-[2.6rem]">
          Three steps, one of them yours
        </SplitReveal>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-mutedtext">
          Research being wrong is cheap to redo. A built system being wrong is not — so
          the one approval sits exactly where the cost of being wrong becomes real.
        </p>
      </Reveal>

      <RevealGroup className="mt-12 grid gap-5 md:grid-cols-3" stagger={0.09}>
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="flex flex-col rounded-[10px] border border-hairline bg-surface p-7 text-left transition-colors duration-300 hover:border-mutedtext/40"
          >
            <span className="display text-2xl text-accent">{step.n}</span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-bodytext">{step.body}</p>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}
