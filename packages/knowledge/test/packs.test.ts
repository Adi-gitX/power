import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadPacks, PACKS_ROOT } from '../src/registry.js';
import { renderSelector, renderTestingInstructions } from '../src/selector.js';
import { PackError, type Pack } from '../src/types.js';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function makePacks(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'power-packs-'));
  dirs.push(root);
  mkdirSync(join(root, 'packs'), { recursive: true });
  for (const [path, content] of Object.entries(files)) {
    writeFileSync(join(root, 'packs', path), content);
  }
  return root;
}

const VALID = `
name: sample_pack
title: A sample
version: 1
category: integration
owner: platform
summary: Does a thing.
matching_criteria:
  - the task does the thing
content: sample.md
`;

describe('the shipped registry', () => {
  it('loads and has no orphan bodies', () => {
    const { packs, orphanFiles } = loadPacks(PACKS_ROOT);
    expect(packs.length).toBeGreaterThan(0);
    expect(orphanFiles).toEqual([]);
  });

  it('gives every pack a non-empty body and at least one matching criterion', () => {
    for (const pack of loadPacks(PACKS_ROOT).packs) {
      expect(pack.body.length, `${pack.name} has an empty body`).toBeGreaterThan(100);
      expect(pack.matching_criteria.length).toBeGreaterThan(0);
    }
  });
});

describe('validation', () => {
  it('accepts a well-formed pack', () => {
    const root = makePacks({ 'sample.pack.yaml': VALID, 'sample.md': '# body' });
    expect(loadPacks(root).packs[0]!.name).toBe('sample_pack');
  });

  it('defaults enabled to true', () => {
    const root = makePacks({ 'sample.pack.yaml': VALID, 'sample.md': '# body' });
    expect(loadPacks(root).packs[0]!.enabled).toBe(true);
  });

  it.each([
    ['name', 'title'],
    ['summary', 'summary'],
    ['content', 'content'],
    ['matching_criteria', 'matching_criteria'],
  ])('fails when %s is missing', (_label, field) => {
    const root = makePacks({
      'sample.pack.yaml': VALID.replace(new RegExp(`^${field}:.*$`, 'm'), ''),
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(PackError);
  });

  it('fails when the body file does not exist', () => {
    const root = makePacks({ 'sample.pack.yaml': VALID });
    expect(() => loadPacks(root)).toThrow(/content `sample.md` does not exist/);
  });

  // An unregistered body is maintained, reviewed, and never shipped — the
  // reference repository carries three of them.
  it('reports a body file no definition references', () => {
    const root = makePacks({
      'sample.pack.yaml': VALID,
      'sample.md': '# body',
      'forgotten.md': '# nobody registers me',
    });
    expect(loadPacks(root).orphanFiles).toEqual(['forgotten.md']);
  });

  it('fails on an unknown category', () => {
    const root = makePacks({
      'sample.pack.yaml': VALID.replace('category: integration', 'category: vibes'),
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(/unknown category `vibes`/);
  });

  it('fails on a name that is not a stable key', () => {
    const root = makePacks({
      'sample.pack.yaml': VALID.replace('name: sample_pack', 'name: Sample-Pack'),
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(/must be lower_snake_case/);
  });

  it('fails on a duplicate pack name', () => {
    const root = makePacks({
      'a.pack.yaml': VALID,
      'b.pack.yaml': VALID,
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(/duplicate pack name `sample_pack`/);
  });

  it('fails on empty matching criteria, which could never be selected', () => {
    const root = makePacks({
      'sample.pack.yaml': VALID.replace('  - the task does the thing', ''),
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(/matching_criteria is empty/);
  });

  it('fails when a deprecated pack is still enabled', () => {
    const root = makePacks({
      'old.pack.yaml': VALID.replace('name: sample_pack', 'name: old_pack'),
      'new.pack.yaml': `${VALID.replace('name: sample_pack', 'name: new_pack')}deprecates: [old_pack]\n`,
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(/still enabled/);
  });

  it('accepts a deprecation when the old pack is disabled', () => {
    const root = makePacks({
      'old.pack.yaml': `${VALID.replace('name: sample_pack', 'name: old_pack')}enabled: false\n`,
      'new.pack.yaml': `${VALID.replace('name: sample_pack', 'name: new_pack')}deprecates: [old_pack]\n`,
      'sample.md': '# body',
    });
    expect(loadPacks(root).packs).toHaveLength(2);
  });

  it('fails on deprecating a pack that does not exist', () => {
    const root = makePacks({
      'sample.pack.yaml': `${VALID}deprecates: [ghost]\n`,
      'sample.md': '# body',
    });
    expect(() => loadPacks(root)).toThrow(/deprecates unknown pack `ghost`/);
  });
});

describe('the generated selector', () => {
  const pack = (over: Partial<Pack> = {}): Pack => ({
    name: 'sample_pack',
    title: 'A sample',
    version: 1,
    category: 'integration',
    owner: 'platform',
    enabled: true,
    summary: 'Does a thing.',
    matching_criteria: ['the task does the thing'],
    content: 'sample.md',
    body: '# body',
    ...over,
  });

  it('lists an enabled pack with its criteria', () => {
    const output = renderSelector([pack()]);
    expect(output).toContain('sample_pack (v1)');
    expect(output).toContain('the task does the thing');
  });

  // The whole point: the selector is derived, so a disabled pack cannot linger
  // in a hand-maintained list.
  it('omits a disabled pack entirely', () => {
    expect(renderSelector([pack({ enabled: false })])).not.toContain('sample_pack');
  });

  it('renders anti-criteria so a pack does not over-trigger on its title', () => {
    const output = renderSelector([pack({ anti_criteria: ['the task is unrelated'] })]);
    expect(output).toContain('Do NOT use when');
    expect(output).toContain('the task is unrelated');
  });

  it('names required configuration', () => {
    expect(renderSelector([pack({ requires_secrets: ['API_KEY'] })])).toContain('`API_KEY`');
  });

  it('says so plainly when nothing is registered', () => {
    expect(renderSelector([])).toContain('No capability packs are currently registered');
  });

  it('collects testing instructions only from enabled packs', () => {
    const output = renderTestingInstructions([
      pack({ testing_instructions: 'assert the reconnect path' }),
      pack({ name: 'off_pack', enabled: false, testing_instructions: 'never shown' }),
    ]);
    expect(output).toContain('assert the reconnect path');
    expect(output).not.toContain('never shown');
  });

  it('returns nothing when no pack contributes testing guidance', () => {
    expect(renderTestingInstructions([pack()])).toBe('');
  });
});
