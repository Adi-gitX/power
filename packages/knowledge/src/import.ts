/**
 * Import the reference prompt repository's playbooks as capability packs.
 *
 * The source corpus is the `prompts` repo: 64 registered integration playbooks
 * plus a set of design-guideline documents its own registry never references.
 * This converts all of it into Power's pack format — which exists precisely
 * because that repo's format loses things:
 *
 *   - Matching criteria live *in the pack* here, so the generated selector can
 *     never drift from the catalogue. There, selection lives in 1,200 lines of
 *     hand-maintained prose.
 *   - The design guidelines are first-class `design` packs here. There, they sit
 *     orphaned on disk — maintained, reviewed, and never shipped.
 *   - Provenance is explicit: every imported pack carries `owner: prompts-repo`
 *     and an `imported` tag, so a hand-authored Power pack and an imported one
 *     are never confused.
 *
 * **Platform-bound playbooks import disabled.** A number of them instruct the
 * agent to use services that exist only inside the source platform — its OAuth
 * broker, its credit system, its object store. Followed outside that platform,
 * those instructions produce code that calls endpoints which do not exist. They
 * are imported (the catalogue should be complete) but `enabled: false`, each
 * with the reason in its summary, so the selector never offers them and a human
 * can re-enable any one deliberately after adapting it.
 *
 * The import is deterministic: same source in, byte-identical packs out.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { PackError, type PackCategory } from './types.js';

interface SourcePlaybook {
  key: string;
  description: string;
  file: string;
  integration_type: string;
  body: string;
}

/**
 * Markers of source-platform infrastructure. A body that matches any of these
 * gives instructions that only work inside that platform, so the pack imports
 * disabled rather than being offered to an implementer who cannot follow it.
 */
const PLATFORM_MARKERS: readonly RegExp[] = [
  /auth\.yourplatform\.com|platform auth|the platform provides hassle-free/i,
  /credit[s]? (exhausted|system|balance)/i,
  /platform object store/i,
  /Power\.ai|customer-assets\.Poweragent\.com/i,
  /\bpreview url\b.*\bplatform\b/i,
];

/** keyword → matching criteria, applied by scanning name + description + body head. */
const CRITERIA_RULES: readonly { pattern: RegExp; criteria: string[] }[] = [
  {
    pattern: /\bauth|oauth|login|session token|jwt\b/i,
    criteria: [
      'the task implements user sign-in, sign-up, or session handling',
      'the task touches authentication tokens, cookies, or an OAuth flow',
    ],
  },
  {
    pattern: /payment|stripe|checkout|billing|subscription/i,
    criteria: [
      'the task takes payment, manages subscriptions, or handles checkout',
      'the task integrates a payment provider or webhook for payment events',
    ],
  },
  {
    pattern: /llm|chat|openai|anthropic|gemini|completion|conversation/i,
    criteria: [
      'the task calls a large language model API',
      'the task builds chat, completion, or conversation features',
    ],
  },
  {
    pattern: /image generation|image gen|dall|flux|stable diffusion|fal\.ai/i,
    criteria: ['the task generates images from prompts via a hosted model API'],
  },
  {
    pattern: /video generation|sora|runway/i,
    criteria: ['the task generates video from prompts via a hosted model API'],
  },
  {
    pattern: /whatsapp|telegram|discord|slack|sms|twilio/i,
    criteria: ['the task sends or receives messages on a chat or messaging platform'],
  },
  {
    pattern: /email|smtp|sendgrid|resend|mailgun/i,
    criteria: ['the task sends transactional or bulk email'],
  },
  {
    pattern: /map|geocod|places|location/i,
    criteria: ['the task shows maps, geocodes addresses, or works with place data'],
  },
  {
    pattern: /upload|storage|s3|cloudinary|object store|file/i,
    criteria: ['the task uploads, stores, or serves user files or media'],
  },
  {
    pattern: /websocket|realtime|real-time|socket\.io|live update/i,
    criteria: ['the task needs a persistent connection or live updates between client and server'],
  },
  {
    pattern: /scrap|crawl|browser automation|playwright|puppeteer/i,
    criteria: ['the task extracts data from web pages or automates a browser'],
  },
  {
    pattern: /stock|market data|crypto|coingecko|alpha.?vantage|finance/i,
    criteria: ['the task fetches financial or market data from a provider API'],
  },
  {
    pattern: /calendar|scheduling|booking|appointment/i,
    criteria: ['the task manages calendars, bookings, or scheduled appointments'],
  },
  {
    pattern: /search|vector|embedding|pinecone|rag\b/i,
    criteria: ['the task builds search, retrieval, or embedding-backed features'],
  },
  {
    pattern: /pdf|document generation|export|report/i,
    criteria: ['the task generates documents, PDFs, or downloadable reports'],
  },
];

function deriveCriteria(name: string, description: string, body: string): string[] {
  const haystack = `${name} ${description} ${body.slice(0, 2000)}`;
  const criteria: string[] = [];
  for (const rule of CRITERIA_RULES) {
    if (rule.pattern.test(haystack)) criteria.push(...rule.criteria);
  }
  // Every pack gets its identity criterion, so an exact ask always matches even
  // when no keyword rule fired.
  criteria.push(`the task integrates ${description.trim() || name}`);
  return [...new Set(criteria)];
}

function isPlatformBound(body: string): boolean {
  return PLATFORM_MARKERS.some((marker) => marker.test(body));
}

function toPackName(key: string): string {
  const name = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, 'p$1');
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new PackError(`cannot derive a valid pack name from \`${key}\``);
  }
  return name;
}

/** YAML-safe single-line string. */
function y(text: string): string {
  return JSON.stringify(text.replace(/\s+/g, ' ').trim());
}

function renderManifest(fields: {
  name: string;
  title: string;
  category: PackCategory;
  enabled: boolean;
  summary: string;
  criteria: string[];
  anti: string[];
  content: string;
  sourceFile: string;
}): string {
  const lines = [
    `# Imported from the reference prompts repository (playbooks/${fields.sourceFile}).`,
    `# Regenerate with \`pnpm --filter @power/knowledge run import <source>\` — do not hand-edit;`,
    `# hand-authored changes belong in a new pack that \`deprecates\` this one.`,
    `name: ${fields.name}`,
    `title: ${y(fields.title)}`,
    `version: 1`,
    `category: ${fields.category}`,
    `owner: prompts-repo`,
  ];
  if (!fields.enabled) lines.push(`enabled: false`);
  lines.push(`summary: ${y(fields.summary)}`);
  lines.push(`matching_criteria:`);
  for (const c of fields.criteria) lines.push(`  - ${y(c)}`);
  if (fields.anti.length > 0) {
    lines.push(`anti_criteria:`);
    for (const c of fields.anti) lines.push(`  - ${y(c)}`);
  }
  lines.push(`tags: [imported]`);
  lines.push(`content: ${fields.content}`);
  return lines.join('\n') + '\n';
}

/**
 * A body this small carries no guidance — the source repo registers one playbook
 * whose entire body is two bytes. Offering that to the selector is pure noise,
 * so the importer skips it and says so, rather than shipping an empty promise.
 */
const MIN_BODY_BYTES = 200;

export interface ImportResult {
  written: number;
  enabled: number;
  disabledPlatformBound: string[];
  designPacks: number;
  /** Source entries skipped because their body was effectively empty. */
  skippedEmpty: string[];
}

/**
 * Convert the source repo's playbooks into packs under `<packsRoot>/packs/imported/`.
 *
 * The output directory is cleared first — these files are generated, and a stale
 * pack surviving a rename would be exactly the orphan-body defect the loader
 * exists to reject.
 */
export function importPlaybooks(sourceRoot: string, packsRoot: string): ImportResult {
  const manifestPath = join(sourceRoot, 'playbooks.yaml');
  const playbooksDir = join(sourceRoot, 'playbooks');
  if (!existsSync(manifestPath) || !existsSync(playbooksDir)) {
    throw new PackError(`\`${sourceRoot}\` does not look like the prompts repo (need playbooks.yaml and playbooks/)`);
  }

  const manifest = parseYaml(readFileSync(manifestPath, 'utf8')) as {
    playbooks: Record<string, { description?: string; file: string; integration_type?: string }>;
  };

  const outDir = join(packsRoot, 'packs', 'imported');
  if (existsSync(outDir)) rmSync(outDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const result: ImportResult = {
    written: 0,
    enabled: 0,
    disabledPlatformBound: [],
    designPacks: 0,
    skippedEmpty: [],
  };

  // ---- Registered integration playbooks ----
  const entries = Object.entries(manifest.playbooks).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, entry] of entries) {
    const bodyPath = join(playbooksDir, entry.file);
    if (!existsSync(bodyPath)) {
      throw new PackError(`playbooks.yaml registers \`${entry.file}\`, which does not exist`);
    }
    const body = readFileSync(bodyPath, 'utf8');
    const name = `pb_${toPackName(key)}`;
    const description = entry.description ?? key;

    if (Buffer.byteLength(body, 'utf8') < MIN_BODY_BYTES) {
      result.skippedEmpty.push(`${key} (${entry.file}, ${Buffer.byteLength(body, 'utf8')} bytes)`);
      continue;
    }
    const platformBound = isPlatformBound(body);

    const summary = platformBound
      ? `${description}. DISABLED ON IMPORT: this playbook instructs the agent to use ` +
        `source-platform services (its auth broker, credit system, or asset host) that do not ` +
        `exist outside that platform. Adapt it before enabling.`
      : `Integration guidance for ${description}, imported from the reference playbook corpus.`;

    writeFileSync(
      join(outDir, `${name}.pack.yaml`),
      renderManifest({
        name,
        title: description,
        category: entry.integration_type === 'nfr' ? 'infrastructure' : 'integration',
        enabled: !platformBound,
        summary,
        criteria: deriveCriteria(key, description, body),
        anti: platformBound
          ? ['always — this pack is disabled until its platform-specific instructions are adapted']
          : [],
        content: `imported/${name}.md`,
        sourceFile: entry.file,
      }),
    );
    writeFileSync(join(outDir, `${name}.md`), body);
    result.written += 1;
    if (platformBound) result.disabledPlatformBound.push(name);
    else result.enabled += 1;
  }

  // ---- Design guidelines: orphans in the source repo, first-class packs here ----
  const guidelineFiles = readdirSync(playbooksDir)
    .filter((f) => /^Guideline-.*\.md$/.test(f) && !/backup/i.test(f))
    .sort();

  for (const file of guidelineFiles) {
    const body = readFileSync(join(playbooksDir, file), 'utf8');
    const slug = toPackName(file.replace(/^Guideline-/, '').replace(/\.md$/, ''));
    const name = `design_${slug}`;
    const label = file.replace(/^Guideline-/, '').replace(/\.md$/, '').replace(/-/g, ' ');

    writeFileSync(
      join(outDir, `${name}.pack.yaml`),
      renderManifest({
        name,
        title: `Design language: ${label}`,
        category: 'design',
        enabled: true,
        summary:
          `A complete visual direction (${label}) — palette, type, spacing, and component ` +
          `treatments — imported from the reference design-guideline corpus.`,
        criteria: [
          `the task builds user-facing UI and the requested aesthetic matches: ${label}`,
          'the task asks for a designed front end rather than an unstyled scaffold',
        ],
        anti: ['the task is a CLI, API, or library with no visual surface'],
        content: `imported/${name}.md`,
        sourceFile: file,
      }),
    );
    writeFileSync(join(outDir, `${name}.md`), body);
    result.written += 1;
    result.enabled += 1;
    result.designPacks += 1;
  }

  return result;
}
