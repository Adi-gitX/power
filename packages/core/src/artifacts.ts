/**
 * The artifact bus.
 *
 * Agents hand work to each other through typed files, never through shared
 * conversation. That is what makes every stage independently re-runnable and a
 * crashed run resumable: a worker's context is disposable, the artifacts are not.
 *
 * The single-writer rule is enforced here rather than trusted to the prompt.
 * A prompt instruction is a strong prior; a check is a guarantee, and the cost
 * of a violated ownership rule is a corrupted audit trail that nobody notices
 * until they need it.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const ARTIFACTS = [
  'brief.json',
  'constitution.md',
  'state.json',
  'research.json',
  'research.md',
  'SPEC.md',
  'review.json',
  'test-report.json',
  'verification.json',
] as const;

export type ArtifactName = (typeof ARTIFACTS)[number];

/** Exactly one agent may write each artifact. */
export const ARTIFACT_OWNERS: Record<ArtifactName, string> = {
  'brief.json': 'power_orchestrator',
  'constitution.md': 'power_orchestrator',
  'state.json': 'power_orchestrator',
  'research.json': 'power_researcher',
  'research.md': 'power_researcher',
  'SPEC.md': 'power_architect',
  'review.json': 'power_reviewer',
  'test-report.json': 'power_tester',
  'verification.json': 'power_verifier',
};

/**
 * Artifacts the orchestrator may amend after the fact. `SPEC.md` is the only
 * one: the pipeline explicitly allows the orchestrator to patch an ambiguity the
 * implementer reports rather than burning a full architect re-run on one line.
 */
const ORCHESTRATOR_PATCHABLE = new Set<ArtifactName>(['SPEC.md']);

export class ArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArtifactError';
  }
}

export function isArtifactName(value: string): value is ArtifactName {
  return (ARTIFACTS as readonly string[]).includes(value);
}

/** Throws unless `agent` owns `artifact` (or is the orchestrator patching a spec). */
export function assertCanWrite(agent: string, artifact: ArtifactName): void {
  const owner = ARTIFACT_OWNERS[artifact];
  if (agent === owner) return;
  if (agent === 'power_orchestrator' && ORCHESTRATOR_PATCHABLE.has(artifact)) return;
  throw new ArtifactError(
    `${agent} may not write ${artifact}; it is owned by ${owner}. ` +
      `If ${artifact} is wrong, re-run ${owner} with a corrected brief rather than editing it.`,
  );
}

export interface ArtifactStore {
  read(name: ArtifactName): Promise<string | undefined>;
  write(agent: string, name: ArtifactName, content: string): Promise<void>;
  list(): Promise<ArtifactName[]>;
  /** Every artifact present, for handing a whole stage to the gate layer. */
  readAll(): Promise<Partial<Record<ArtifactName, string>>>;
}

/**
 * Filesystem-backed store. Used for local runs, tests, and as the shape the
 * container's mounted memory store presents.
 */
export class LocalArtifactStore implements ArtifactStore {
  constructor(private readonly root: string) {}

  private path(name: ArtifactName): string {
    return join(this.root, name);
  }

  async read(name: ArtifactName): Promise<string | undefined> {
    try {
      return await readFile(this.path(name), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async write(agent: string, name: ArtifactName, content: string): Promise<void> {
    assertCanWrite(agent, name);
    const path = this.path(name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
  }

  async list(): Promise<ArtifactName[]> {
    try {
      const entries = await readdir(this.root);
      return entries.filter(isArtifactName);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  async readAll(): Promise<Partial<Record<ArtifactName, string>>> {
    const result: Partial<Record<ArtifactName, string>> = {};
    for (const name of await this.list()) {
      const content = await this.read(name);
      if (content !== undefined) result[name] = content;
    }
    return result;
  }
}

/**
 * Read a JSON artifact and parse it, with an error that names the artifact.
 * A bare `Unexpected token }` tells the operator nothing about which of nine
 * files is malformed.
 */
export async function readJson<T>(
  store: ArtifactStore,
  name: ArtifactName,
): Promise<T | undefined> {
  const raw = await store.read(name);
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch (cause) {
    throw new ArtifactError(`${name} is not valid JSON: ${(cause as Error).message}`);
  }
}

export async function writeJson(
  store: ArtifactStore,
  agent: string,
  name: ArtifactName,
  value: unknown,
): Promise<void> {
  await store.write(agent, name, `${JSON.stringify(value, null, 2)}\n`);
}
