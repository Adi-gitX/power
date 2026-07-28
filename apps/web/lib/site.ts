/**
 * Every fact the page states about the product, in one place.
 *
 * The install commands in particular are load-bearing: they are on the page
 * twice, behind copy buttons, and a reader will paste them verbatim. They must
 * match the repository README exactly, so they live here rather than being
 * retyped in each component.
 */

export const SITE = {
  name: 'Power',
  tagline: 'An autonomous engineering team inside your own Claude Code session.',
  description:
    'Describe a goal and Power runs the whole pipeline — research, spec, implementation, ' +
    'review, tests, acceptance, documentation — dispatching eight specialist agents through ' +
    'a state machine whose stage boundaries are enforced by gates that execute as code.',
  // Override at build time with NEXT_PUBLIC_SITE_URL when the domain is real.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://power.dev',
  repo: 'https://github.com/AdiGitX/power',
  docs: 'https://github.com/AdiGitX/power#readme',
} as const;

export const INSTALL = {
  marketplace: '/plugin marketplace add ~/Library/power',
  install: '/plugin install power',
  /** Both lines together — what the primary copy button yields. */
  both: '/plugin marketplace add ~/Library/power\n/plugin install power',
  deps: 'cd ~/Library/power && pnpm install',
} as const;

export interface CommandTab {
  id: string;
  label: string;
  command: string;
  blurb: string;
  detail: string;
}

/** The four things `/power` does. Mirrors the table in the README. */
export const COMMANDS: readonly CommandTab[] = [
  {
    id: 'build',
    label: 'build',
    command: '/power build "a rate-limited URL shortener with tests"',
    blurb: 'The full pipeline, from a sentence to working code.',
    detail:
      'Research, spec, implementation, review, tests, acceptance, docs. You are asked ' +
      'to approve the spec once; everything after that runs unattended.',
  },
  {
    id: 'continue',
    label: 'continue',
    command: '/power continue',
    blurb: 'Resume an interrupted run.',
    detail:
      'Run state lives in .power/run.json in the repository, not in a session. Power ' +
      'reconciles the state file against what is actually on disk before picking up — ' +
      'where they disagree, the artifacts win.',
  },
  {
    id: 'review',
    label: 'review',
    command: '/power review',
    blurb: 'A quality pass over code that already exists.',
    detail:
      'Dispatches the reviewer and the tester concurrently over a codebase Power did not ' +
      'build, and reports what they found. It changes nothing.',
  },
  {
    id: 'status',
    label: 'status',
    command: '/power status',
    blurb: 'Where the current run is.',
    detail:
      'Phase, gate results, how much of each retry budget is spent, and whether the ' +
      'three deploy conditions are met.',
  },
];
