import { Reveal, RevealGroup } from './Reveal';
import { ShieldCheck, Repeat, UserCheck, Lock, Save, Users } from 'lucide-react';

/**
 * Six claims, each one something the repository actually enforces. Nothing here
 * describes an intention — if a line could not be traced to a test or a gate, it
 * is not on the page.
 */
const TILES = [
  {
    icon: ShieldCheck,
    title: 'Gates run as code',
    body: 'Stage boundaries are decided by a validator over the files on disk, not by asking an agent whether its own work was good enough.',
  },
  {
    icon: Repeat,
    title: 'Retries are counted',
    body: 'Every feedback edge is capped at two. On the third the run blocks and explains itself, instead of burning budget looking like progress.',
  },
  {
    icon: UserCheck,
    title: 'Exactly one human gate',
    body: 'You approve the spec. The state machine refuses an approval for a spec that has not passed its gate, so it can never route around a defect.',
  },
  {
    icon: Lock,
    title: 'Boundaries are tool grants',
    body: 'The reviewer and verifier hold no editor, so neither can fix what it judges. That is a permission, not an instruction they might drift from.',
  },
  {
    icon: Save,
    title: 'Runs outlive the session',
    body: 'State lives in .power/run.json in your repository. Close the laptop, come back tomorrow, and continue where it stopped.',
  },
  {
    icon: Users,
    title: 'Eight specialists',
    body: 'Researcher, architect, implementer, reviewer, tester, verifier, documenter — and an orchestrator with no ability to do any of their jobs.',
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-8">
      <Reveal>
        <h2 className="mx-auto max-w-xl display text-3xl text-ink sm:text-[2.6rem]">
          Autonomy you can leave alone
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-mutedtext">
          Not because it always gets it right — because when it does not, it stops and
          tells you which rule it failed.
        </p>
      </Reveal>

      <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
        {TILES.map((tile) => (
          <div
            key={tile.title}
            className="rounded-[10px] border border-hairline bg-surface p-6 text-left transition-colors duration-300 hover:border-mutedtext/40"
          >
            <tile.icon className="h-5 w-5 text-accent" strokeWidth={1.5} aria-hidden="true" />
            <h3 className="mt-4 text-base font-semibold text-ink">{tile.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-mutedtext">{tile.body}</p>
          </div>
        ))}
      </RevealGroup>
    </section>
  );
}
