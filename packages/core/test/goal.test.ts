import { describe, expect, it } from 'vitest';
import { compileGoal } from '../src/goal.js';

const goal = 'Build a service that drafts a changelog when a release tag is pushed';

describe('the goal compiler', () => {
  it('rejects a goal too short to act on', () => {
    expect(() => compileGoal({ goal: 'fix it', traceId: 't' })).toThrow(/too short/);
  });

  it('produces a brief carrying the trace id', () => {
    const { brief } = compileGoal({ goal, traceId: 'trace-9' });
    expect(brief.goal).toBe(goal);
    expect(brief.trace_id).toBe('trace-9');
  });

  // An empty unknowns list would hand the researcher no assignment, which in
  // practice produces a survey instead of a decision.
  it('supplies default unknowns when the caller gives none', () => {
    const { brief } = compileGoal({ goal, traceId: 't' });
    expect(brief.unknowns.length).toBeGreaterThanOrEqual(3);
  });

  it('prefers caller-supplied unknowns over the defaults', () => {
    const { brief } = compileGoal({
      goal,
      traceId: 't',
      unknowns: ['Does the host expose a tag webhook?'],
    });
    expect(brief.unknowns).toEqual(['Does the host expose a tag webhook?']);
  });

  it('always grades the process contract, not only the goal', () => {
    const { rubric } = compileGoal({ goal, traceId: 't' });
    expect(rubric).toContain('THE SYSTEM SHALL');
    expect(rubric).toContain('source_url');
    expect(rubric).toContain('P0');
    expect(rubric).toContain('stub');
  });

  it('falls back to the goal itself when no success criteria are given', () => {
    const { rubric } = compileGoal({ goal, traceId: 't' });
    expect(rubric).toContain(goal);
  });

  it('uses explicit success criteria when supplied', () => {
    const { rubric } = compileGoal({
      goal,
      traceId: 't',
      successCriteria: ['A draft appears within 60 seconds of a tag push'],
    });
    expect(rubric).toContain('A draft appears within 60 seconds');
  });

  it('includes constraints as their own gradeable block', () => {
    const { rubric } = compileGoal({
      goal,
      traceId: 't',
      constraints: ['No repository content is persisted'],
    });
    expect(rubric).toContain('Constraints that must hold');
    expect(rubric).toContain('No repository content is persisted');
  });

  it('omits the constraints block entirely when there are none', () => {
    expect(compileGoal({ goal, traceId: 't' }).rubric).not.toContain('Constraints that must hold');
  });

  it('puts the trace id in the outcome description so workers can echo it', () => {
    const { outcomeDescription } = compileGoal({ goal, traceId: 'trace-42' });
    expect(outcomeDescription).toContain('trace-42');
    expect(outcomeDescription).toContain('run_gate');
  });
});
