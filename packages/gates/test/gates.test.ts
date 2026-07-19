import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGate, type GateError } from '../src/index.js';

const FIXTURES = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
const read = (kind: 'golden' | 'broken', file: string): string =>
  readFileSync(join(FIXTURES, kind, file), 'utf8');

const rules = (errors: GateError[]): string[] => [...new Set(errors.map((e) => e.rule))].sort();

describe('golden artifacts pass', () => {
  it('research', () => {
    const result = runGate('research', { 'research.json': read('golden', 'research.json') });
    expect(result.errors).toEqual([]);
    expect(result.pass).toBe(true);
  });

  it('spec', () => {
    const result = runGate('spec', { 'SPEC.md': read('golden', 'SPEC.md') });
    expect(result.errors).toEqual([]);
    expect(result.pass).toBe(true);
  });

  it('verification', () => {
    const result = runGate('verification', {
      'verification.json': read('golden', 'verification.json'),
    });
    expect(result.errors).toEqual([]);
    expect(result.pass).toBe(true);
  });
});

describe('a missing artifact fails rather than passing vacuously', () => {
  it.each(['research', 'spec', 'verification'] as const)('%s', (stage) => {
    const result = runGate(stage, {});
    expect(result.pass).toBe(false);
    expect(rules(result.errors)).toContain('artifact.missing');
  });
});

describe('broken research', () => {
  it('fails every emptiness rule, not merely "fails"', () => {
    const result = runGate('research', { 'research.json': read('broken', 'research.json') });
    expect(result.pass).toBe(false);

    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('summary'); // minLength 40
    expect(fields).toContain('unknowns_resolved'); // minItems 1
    expect(fields).toContain('prior_art');
    expect(fields).toContain('users/pain_points');
    expect(fields).toContain('sources');
  });

  it('rejects a citation that is absent from sources[]', () => {
    const result = runGate('research', {
      'research.json': read('broken', 'research-unlisted-source.json'),
    });
    expect(result.pass).toBe(false);
    expect(rules(result.errors)).toContain('sources.unlisted');
    expect(result.errors.find((e) => e.rule === 'sources.unlisted')?.detail).toContain(
      'https://example.invalid/fabricated-study',
    );
  });

  it('rejects malformed JSON with a usable message', () => {
    const result = runGate('research', { 'research.json': '{ not json' });
    expect(rules(result.errors)).toEqual(['json.invalid']);
  });
});

describe('broken spec', () => {
  const result = runGate('spec', { 'SPEC.md': read('broken', 'SPEC.md') });

  it('does not pass', () => {
    expect(result.pass).toBe(false);
  });

  // The headline fix over the reference harness, which counts EARS lines in
  // aggregate: three criteria under R1 with R2 and R3 bare would satisfy it.
  it('flags the specific requirement that has no EARS criterion of its own', () => {
    const ears = result.errors.filter((e) => e.rule === 'ears.missing');
    expect(ears.map((e) => e.field)).toEqual(['R1']);
  });

  it('flags a requirement declared in frontmatter but absent from the body', () => {
    const error = result.errors.find((e) => e.rule === 'traceability.undefined_requirement');
    expect(error?.field).toBe('frontmatter.requirement_ids.R2');
  });

  it('flags a requirement specified in the body but undeclared in frontmatter', () => {
    const error = result.errors.find((e) => e.rule === 'traceability.undeclared_requirement');
    expect(error?.field).toBe('R3');
  });

  it('flags a task that cites no requirement', () => {
    const error = result.errors.find((e) => e.rule === 'tasks.missing_requirement_ref');
    expect(error?.detail).toContain('Build the webhook receiver');
  });

  it('flags a task citing a requirement that does not exist', () => {
    const error = result.errors.find((e) => e.rule === 'tasks.unknown_requirement_ref');
    expect(error?.detail).toContain('R9');
  });

  it('flags the missing sections', () => {
    const missing = result.errors
      .filter((e) => e.rule === 'section.missing')
      .map((e) => e.field)
      .sort();
    expect(missing).toEqual(['data model', 'interfaces']);
  });

  // The reference harness does a substring test on the whole body, so "Goals"
  // is satisfied by "Non-Goals" and by any prose mentioning the word.
  it('does not accept a section name that only appears inside another heading', () => {
    const spec = read('golden', 'SPEC.md').replace(
      '## Goals and Non-Goals',
      '## Non-Goals',
    );
    const rerun = runGate('spec', { 'SPEC.md': spec });
    expect(
      rerun.errors.some(
        (e) => e.rule === 'section.missing' && e.field === 'goals and non-goals',
      ),
    ).toBe(true);
  });

  it('rejects a spec with no frontmatter at all', () => {
    const result = runGate('spec', { 'SPEC.md': '## Product Summary\n\nJust a body.\n' });
    expect(rules(result.errors)).toEqual(['frontmatter.missing']);
  });

  it('rejects a requirement id that is not R-prefixed', () => {
    const spec = read('golden', 'SPEC.md').replace(
      'requirement_ids: [R1, R2, R3]',
      'requirement_ids: [REQ-1, R2, R3]',
    );
    const rerun = runGate('spec', { 'SPEC.md': spec });
    expect(rules(rerun.errors)).toContain('schema.pattern');
  });
});

describe('broken verification', () => {
  const result = runGate('verification', {
    'verification.json': read('broken', 'verification.json'),
  });

  it('does not accept a self-declared pass that contradicts its own evidence', () => {
    expect(result.pass).toBe(false);
    expect(rules(result.errors)).toEqual([
      'verification.below_visual_bar',
      'verification.not_interacted',
      'verification.p0_failed',
    ]);
  });

  it('names which P0 criterion failed and which was not interacted with', () => {
    expect(result.errors.find((e) => e.rule === 'verification.p0_failed')?.field).toBe('R1');
    expect(result.errors.find((e) => e.rule === 'verification.not_interacted')?.field).toBe('R2');
  });

  it('leaves an honest failure report alone', () => {
    const honest = JSON.parse(read('broken', 'verification.json'));
    honest.pass = false;
    const rerun = runGate('verification', { 'verification.json': JSON.stringify(honest) });
    expect(rerun.errors).toEqual([]);
  });

  it('rejects a pass with no P0 criteria at all', () => {
    const report = JSON.parse(read('golden', 'verification.json'));
    for (const criterion of report.criteria) criterion.priority = 'P2';
    const rerun = runGate('verification', { 'verification.json': JSON.stringify(report) });
    expect(rules(rerun.errors)).toContain('verification.no_p0');
  });
});
