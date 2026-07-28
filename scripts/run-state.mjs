#!/usr/bin/env node
/**
 * Drive the run state machine.
 *
 *   node scripts/run-state.mjs init "<goal>"
 *   node scripts/run-state.mjs show
 *   node scripts/run-state.mjs gate <stage> <pass|fail>
 *   node scripts/run-state.mjs retry <edge> "<reason>"
 *   node scripts/run-state.mjs apply '<event-json>'
 *
 * State persists to `.power/run.json` in the repository, which is what lets a
 * run outlive the session that started it — `/power continue` reads this file.
 *
 * Illegal transitions are refused rather than absorbed: the reducer knows which
 * phase moves are legal, so a job recipe cannot skip the approval gate by
 * applying events in the wrong order.
 */
import { launch } from './_launch.mjs';
import { join } from 'node:path';

launch(join('packages', 'core', 'src', 'cli.ts'), process.argv.slice(2));
