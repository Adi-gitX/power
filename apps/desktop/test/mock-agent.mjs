#!/usr/bin/env node
/**
 * A stage double for engine tests: plays any of the eight roles by writing the
 * artifact that role owns, so the full pipeline — real state machine, real
 * gates — runs with no model and no network.
 *
 *   node mock-agent.mjs <role> <repoDir> <fixturesDir> [mode]
 *
 * mode `broken` writes deliberately gate-failing artifacts (from the broken
 * fixture set), which is how the tests exercise the retry-then-block path.
 */
import { copyFileSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [role, repoDir, fixturesDir, mode = 'golden'] = process.argv.slice(2);
const artifacts = join(repoDir, '.power', 'artifacts');
mkdirSync(artifacts, { recursive: true });

const fixture = (name) => join(fixturesDir, mode, name);

switch (role) {
  case 'researcher':
    copyFileSync(fixture('research.json'), join(artifacts, 'research.json'));
    writeFileSync(join(artifacts, 'research.md'), '# Research\n\nReadable rendering.\n');
    break;
  case 'architect': {
    copyFileSync(fixture('SPEC.md'), join(artifacts, 'SPEC.md'));
    break;
  }
  case 'implementer':
    writeFileSync(join(repoDir, 'index.js'), 'console.log("built");\n');
    break;
  case 'reviewer':
    writeFileSync(join(artifacts, 'review.json'), JSON.stringify({ findings: [] }, null, 2));
    break;
  case 'tester':
    writeFileSync(
      join(artifacts, 'test-report.json'),
      JSON.stringify({ passing: 1, failing: 0 }, null, 2),
    );
    break;
  case 'verifier':
    copyFileSync(fixture('verification.json'), join(artifacts, 'verification.json'));
    break;
  case 'documenter':
    writeFileSync(join(repoDir, 'README.md'), '# Built by a mock\n');
    break;
  default:
    console.error(`unknown role ${role}`);
    process.exit(2);
}
console.log(`${role}: wrote ${mode} artifacts`);
