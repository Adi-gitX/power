import { Reveal, RevealGroup } from './Reveal';
import { CircleAlert, RefreshCw, Eye, FileQuestion, Timer } from 'lucide-react';

/** What you are left doing when one agent has a long leash. */
const WITHOUT = [
  { label: 'Re-reading its claims', icon: Eye },
  { label: 'Was that tested?', icon: FileQuestion },
  { label: 'Retrying, again', icon: RefreshCw },
  { label: 'Silent scope drift', icon: CircleAlert },
  { label: 'Watching it work', icon: Timer },
];

const FLOW = [
  'Describe the goal once',
  'Approve the spec — the only time you are asked',
  'Gates decide each stage, in code',
];

export function Shift() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
      <Reveal>
        <h2 className="mx-auto max-w-2xl display text-3xl text-ink sm:text-[2.6rem]">
          The work is not writing the code. It is trusting it.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-mutedtext">
          An agent that reports its own success gives you a second job: checking. Power
          replaces that with checks that run as code, and stops when they fail.
        </p>
      </Reveal>

      <RevealGroup className="mt-12 grid gap-5 text-left md:grid-cols-2" stagger={0.1}>
        <div className="flex flex-col rounded-[10px] border border-hairline bg-surface p-7 transition-colors duration-300 hover:border-mutedtext/40">
          <h3 className="text-xl font-semibold tracking-tight text-ink">One agent, long leash</h3>
          <p className="mt-3 text-base leading-relaxed text-bodytext">
            It says the tests pass. You go and look. The loop has no floor and no
            budget, so it either finishes or keeps going.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {WITHOUT.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-hairline bg-sunken px-2.5 py-1.5 text-xs text-mutedtext"
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col rounded-[10px] border border-hairline bg-surface p-7 transition-colors duration-300 hover:border-mutedtext/40">
          <h3 className="text-xl font-semibold tracking-tight text-ink">Eight, on a short one</h3>
          <p className="mt-3 text-base leading-relaxed text-bodytext">
            Each stage ends at a validator that runs over the files on disk. An agent
            cannot talk its way past one, because the gate is not in its context.
          </p>
          <div className="relative mt-7 pl-6">
            <span
              className="absolute top-2 bottom-2 left-[5px] w-px bg-hairline"
              aria-hidden="true"
            />
            <ul className="space-y-4">
              {FLOW.map((step, i) => (
                <li key={step} className="relative flex items-center">
                  <span
                    className={`absolute -left-6 h-[11px] w-[11px] rounded-full border-2 ${
                      i === FLOW.length - 1
                        ? 'border-accent bg-accent'
                        : 'border-mutedtext bg-canvas'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-bodytext">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </RevealGroup>
    </section>
  );
}
