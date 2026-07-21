import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { PackError, type Pack, type PackCategory, type PackSource } from './types.js';

const CATEGORIES: readonly PackCategory[] = [
  'integration',
  'design',
  'infrastructure',
  'compliance',
];

const REQUIRED: readonly (keyof PackSource)[] = [
  'name',
  'title',
  'version',
  'category',
  'owner',
  'summary',
  'matching_criteria',
  'content',
];

const NAME = /^[a-z][a-z0-9_]*$/;

export interface LoadedPacks {
  packs: Pack[];
  /** Markdown bodies present on disk that no pack declares. */
  orphanFiles: string[];
}

/**
 * Load and validate every pack under `root`.
 *
 * Fails on the first structural problem. In particular an orphan markdown file
 * is an error rather than a warning: the reference repository carries three
 * playbook bodies that no entry registers, so they are maintained, reviewed, and
 * never shipped — work that looks like it is in production and is not.
 */
export function loadPacks(root: string): LoadedPacks {
  const packsDir = join(root, 'packs');
  if (!existsSync(packsDir)) {
    throw new PackError(`no packs directory at ${packsDir}`);
  }

  const entries = readdirSync(packsDir);
  const definitions = entries.filter((file) => file.endsWith('.pack.yaml')).sort();

  const packs: Pack[] = [];
  const seen = new Map<string, string>();
  const usedBodies = new Set<string>();

  for (const file of definitions) {
    const path = join(packsDir, file);
    let source: PackSource;
    try {
      source = parseYaml(readFileSync(path, 'utf8')) as PackSource;
    } catch (cause) {
      throw new PackError(`${file}: ${(cause as Error).message}`);
    }

    for (const field of REQUIRED) {
      if (source[field] === undefined) {
        throw new PackError(`${file}: missing required field \`${String(field)}\``);
      }
    }

    if (!NAME.test(source.name)) {
      throw new PackError(
        `${file}: name \`${source.name}\` must be lower_snake_case — it is used as a stable key`,
      );
    }
    const previous = seen.get(source.name);
    if (previous) {
      throw new PackError(`duplicate pack name \`${source.name}\` in ${previous} and ${file}`);
    }
    seen.set(source.name, file);

    if (!CATEGORIES.includes(source.category)) {
      throw new PackError(
        `${file}: unknown category \`${source.category}\` (known: ${CATEGORIES.join(', ')})`,
      );
    }
    if (!Number.isInteger(source.version) || source.version < 1) {
      throw new PackError(`${file}: version must be a positive integer`);
    }
    // YAML parses a key with no items as null rather than [], so an
    // Array.isArray guard is load-bearing here, not defensive noise.
    if (!Array.isArray(source.matching_criteria) || source.matching_criteria.length === 0) {
      throw new PackError(
        `${file}: matching_criteria is empty, so the pack can never be selected. ` +
          `Either state when it applies or delete it.`,
      );
    }

    const bodyPath = join(packsDir, source.content);
    if (!existsSync(bodyPath)) {
      throw new PackError(`${file}: content \`${source.content}\` does not exist at ${bodyPath}`);
    }
    usedBodies.add(source.content);

    packs.push({
      ...source,
      enabled: source.enabled ?? true,
      body: readFileSync(bodyPath, 'utf8'),
    });
  }

  // A pack cannot be both superseded and live: the selector would offer two
  // answers to the same question and the agent would pick arbitrarily.
  const enabled = new Set(packs.filter((pack) => pack.enabled).map((pack) => pack.name));
  for (const pack of packs) {
    if (!pack.enabled) continue;
    for (const superseded of pack.deprecates ?? []) {
      if (!seen.has(superseded)) {
        throw new PackError(`${pack.name}: deprecates unknown pack \`${superseded}\``);
      }
      if (enabled.has(superseded)) {
        throw new PackError(
          `${pack.name} deprecates \`${superseded}\`, but \`${superseded}\` is still enabled. ` +
            `Set \`enabled: false\` on it.`,
        );
      }
    }
  }

  const orphanFiles = entries
    .filter((file) => file.endsWith('.md') && !usedBodies.has(file))
    .sort();

  return { packs, orphanFiles };
}

export const PACKS_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
