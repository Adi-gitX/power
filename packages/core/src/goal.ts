/**
 * The goal compiler.
 *
 * Turns one sentence into the two things a run needs: a `brief.json` the
 * orchestrator can delegate from, and a rubric the outcome grader can score
 * against.
 *
 * The rubric is the mechanism by which "keep working until it is done" becomes
 * machine-checkable. Criteria must be independently gradeable — the grader
 * scores each one separately, so a vague criterion produces a loop that never
 * converges because the grader keeps disagreeing with itself.
 */

export interface Brief {
  goal: string;
  audience: string;
  domain: string;
  constraints: string[];
  /** The questions research must resolve before a spec can be written. */
  unknowns: string[];
  success_criteria: string[];
  trace_id: string;
}

export interface CompiledGoal {
  brief: Brief;
  rubric: string;
  outcomeDescription: string;
}

export interface CompileGoalInput {
  goal: string;
  audience?: string;
  domain?: string;
  constraints?: string[];
  unknowns?: string[];
  successCriteria?: string[];
  traceId: string;
}

/**
 * Criteria every Power run is graded on regardless of the goal. These encode
 * the pipeline's own contract: the artifacts exist, they are traceable, and the
 * verifier actually exercised the thing rather than declaring it fine.
 */
const PROCESS_CRITERIA = [
  'A `SPEC.md` exists with YAML frontmatter listing every requirement id, and each ' +
    'requirement has at least one EARS acceptance criterion of its own in the form ' +
    '"WHEN <condition>, THE SYSTEM SHALL <observable behaviour>."',
  'Every task in the spec cites the requirement id it serves.',
  'A `research.json` exists in which every claim carries a `source_url` that also ' +
    'appears in `sources[]`.',
  'The implementation builds, typechecks, and its test suite passes, with the actual ' +
    'command output reported rather than asserted.',
  'A `verification.json` exists in which every P0 requirement has a pass verdict ' +
    'supported by a concrete observation of a real interaction, not a screenshot alone.',
  'No task is reported complete while it still contains a stub, a TODO, or a ' +
    'placeholder that returns fabricated data.',
] as const;

function bullet(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

export function compileGoal(input: CompileGoalInput): CompiledGoal {
  const goal = input.goal.trim();
  if (goal.length < 8) {
    throw new Error(`goal is too short to act on: "${goal}"`);
  }

  const brief: Brief = {
    goal,
    audience: input.audience ?? 'unspecified — resolve during research',
    domain: input.domain ?? 'unspecified — resolve during research',
    constraints: input.constraints ?? [],
    unknowns:
      input.unknowns && input.unknowns.length > 0
        ? input.unknowns
        : [
            'What already exists that solves this, and where does it fall short?',
            'Who has this problem, and what do they do today instead?',
            'What technical or licensing constraints bound the solution?',
          ],
    success_criteria: input.successCriteria ?? [],
    trace_id: input.traceId,
  };

  const goalCriteria =
    brief.success_criteria.length > 0
      ? brief.success_criteria
      : [`The delivered system does what the goal describes: ${goal}`];

  const rubric = [
    '# Acceptance rubric',
    '',
    'Score each criterion independently as met or not met, and say which evidence',
    'you used. A criterion you cannot find evidence for is not met.',
    '',
    '## Goal criteria',
    '',
    bullet(goalCriteria),
    '',
    ...(brief.constraints.length > 0
      ? ['## Constraints that must hold', '', bullet(brief.constraints), '']
      : []),
    '## Process criteria',
    '',
    bullet(PROCESS_CRITERIA),
    '',
  ].join('\n');

  return {
    brief,
    rubric,
    outcomeDescription:
      `${goal}\n\n` +
      `Work through the pipeline: research the unknowns, specify, get the spec approved, ` +
      `build, review, test, and verify. Call run_gate at every stage boundary. ` +
      `Trace id: ${brief.trace_id}.`,
  };
}
