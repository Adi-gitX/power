import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ARTIFACT_OWNERS,
  ArtifactError,
  assertCanWrite,
  isArtifactName,
  LocalArtifactStore,
  readJson,
  writeJson,
} from '../src/artifacts.js';

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length > 0) rmSync(dirs.pop()!, { recursive: true, force: true });
});

function store(): LocalArtifactStore {
  const root = mkdtempSync(join(tmpdir(), 'power-artifacts-'));
  dirs.push(root);
  return new LocalArtifactStore(root);
}

describe('single-writer ownership', () => {
  it('lets the owner write', () => {
    expect(() => assertCanWrite('power_researcher', 'research.json')).not.toThrow();
    expect(() => assertCanWrite('power_architect', 'SPEC.md')).not.toThrow();
  });

  it('stops a non-owner and says what to do instead', () => {
    expect(() => assertCanWrite('power_implementer', 'research.json')).toThrow(ArtifactError);
    expect(() => assertCanWrite('power_implementer', 'research.json')).toThrow(
      /owned by power_researcher.*re-run power_researcher with a corrected brief/s,
    );
  });

  it('stops the verifier from editing what it verifies', () => {
    expect(() => assertCanWrite('power_verifier', 'SPEC.md')).toThrow(ArtifactError);
  });

  it('stops the reviewer from editing the code review target artifacts it does not own', () => {
    expect(() => assertCanWrite('power_reviewer', 'test-report.json')).toThrow(ArtifactError);
  });

  // The one documented exception: the pipeline lets the orchestrator patch a
  // spec ambiguity rather than burn a full architect re-run on one line.
  it('lets the orchestrator patch SPEC.md but nothing else it does not own', () => {
    expect(() => assertCanWrite('power_orchestrator', 'SPEC.md')).not.toThrow();
    expect(() => assertCanWrite('power_orchestrator', 'research.json')).toThrow(ArtifactError);
    expect(() => assertCanWrite('power_orchestrator', 'verification.json')).toThrow(ArtifactError);
  });

  it('enforces ownership at the store, not just in the helper', async () => {
    const s = store();
    await expect(s.write('power_tester', 'SPEC.md', '# nope')).rejects.toThrow(ArtifactError);
  });

  it('assigns every artifact exactly one owner', () => {
    for (const [artifact, owner] of Object.entries(ARTIFACT_OWNERS)) {
      expect(owner, `${artifact} has no owner`).toMatch(/^power_/);
    }
  });
});

describe('the local store', () => {
  it('round-trips a write and a read', async () => {
    const s = store();
    await s.write('power_architect', 'SPEC.md', '# spec');
    expect(await s.read('SPEC.md')).toBe('# spec');
  });

  it('returns undefined for an artifact that was never written', async () => {
    expect(await store().read('SPEC.md')).toBeUndefined();
  });

  it('lists nothing for a directory that does not exist yet', async () => {
    expect(await new LocalArtifactStore('/definitely/not/here').list()).toEqual([]);
  });

  it('ignores files that are not recognised artifacts', async () => {
    const s = store();
    await s.write('power_architect', 'SPEC.md', '# spec');
    await writeJson(s, 'power_researcher', 'research.json', { summary: 'x' });
    expect((await s.list()).sort()).toEqual(['SPEC.md', 'research.json']);
  });

  it('readAll returns only the artifacts present', async () => {
    const s = store();
    await s.write('power_architect', 'SPEC.md', '# spec');
    const all = await s.readAll();
    expect(all).toEqual({ 'SPEC.md': '# spec' });
    expect('research.json' in all).toBe(false);
  });
});

describe('json helpers', () => {
  it('round-trips structured data', async () => {
    const s = store();
    await writeJson(s, 'power_verifier', 'verification.json', { pass: true, visual_score: 4 });
    expect(await readJson(s, 'verification.json')).toEqual({ pass: true, visual_score: 4 });
  });

  it('names the artifact when the JSON is malformed', async () => {
    const s = store();
    await s.write('power_researcher', 'research.json', '{ broken');
    await expect(readJson(s, 'research.json')).rejects.toThrow(
      /research.json is not valid JSON/,
    );
  });
});

describe('artifact name guard', () => {
  it('accepts known names and rejects anything else', () => {
    expect(isArtifactName('SPEC.md')).toBe(true);
    expect(isArtifactName('spec.md')).toBe(false);
    expect(isArtifactName('../../etc/passwd')).toBe(false);
  });
});
