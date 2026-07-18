import { parse as parseYaml } from 'yaml';
import type { GateError } from './types.js';

const ARTIFACT = 'SPEC.md';

/**
 * Sections every spec must have. Matching is on the *normalised whole heading*,
 * not a substring: the reference harness tests `"goals" in body.lower()`, so
 * "Non-Goals" satisfies "Goals" and a section named in a sentence counts as
 * present.
 */
export const REQUIRED_SECTIONS = [
  'product summary',
  'goals and non-goals',
  'users',
  'user stories',
  'requirements',
  'non-functional requirements',
  'architecture',
  'data model',
  'interfaces',
  'tasks',
  'open questions',
  'build handoff',
] as const;

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;
const EARS = /\bWHEN\b[\s\S]{3,400}?\bTHE SYSTEM SHALL\b/i;
const REQUIREMENT_HEADING = /^(R\d+)\b/i;
const REQUIREMENT_ID = /\bR\d+\b/g;
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+\.)[ \t]+(.*)$/gm;

interface Heading {
  level: number;
  text: string;
  /** Offset of the `#` that opens the heading line. */
  start: number;
  /** Offset of the first character after the heading line. */
  bodyStart: number;
}

/** Lowercase, strip emphasis, numbering, and trailing punctuation. */
function normalise(text: string): string {
  return text
    .replace(/[*_`]/g, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/[:.\s]+$/, '')
    .trim()
    .toLowerCase();
}

function parseHeadings(body: string): Heading[] {
  const headings: Heading[] = [];
  for (const match of body.matchAll(HEADING)) {
    headings.push({
      level: match[1]!.length,
      text: normalise(match[2]!),
      start: match.index!,
      bodyStart: match.index! + match[0]!.length,
    });
  }
  return headings;
}

/** Text under `headings[index]`, up to the next heading at the same or higher level. */
function sectionBody(body: string, headings: Heading[], index: number): string {
  const start = headings[index]!;
  for (let i = index + 1; i < headings.length; i++) {
    if (headings[i]!.level <= start.level) {
      return body.slice(start.bodyStart, headings[i]!.start);
    }
  }
  return body.slice(start.bodyStart);
}

export interface ParsedSpec {
  frontmatter: unknown;
  body: string;
}

/** Split frontmatter from body. Returns a GateError instead of throwing. */
export function parseSpec(markdown: string): ParsedSpec | GateError {
  const match = FRONTMATTER.exec(markdown);
  if (!match) {
    return {
      artifact: ARTIFACT,
      field: 'frontmatter',
      rule: 'frontmatter.missing',
      detail:
        'No YAML frontmatter found. The file must open with `---`, the frontmatter keys, then `---`.',
    };
  }
  try {
    return { frontmatter: parseYaml(match[1]!), body: match[2]! };
  } catch (cause) {
    return {
      artifact: ARTIFACT,
      field: 'frontmatter',
      rule: 'frontmatter.invalid_yaml',
      detail: `Frontmatter is not valid YAML: ${(cause as Error).message}`,
    };
  }
}

/**
 * Lint the spec body. The traceability rules here are the reason a schema alone
 * is not enough: they relate the frontmatter, the requirement blocks, and the
 * task list to each other.
 */
export function lintSpecBody(body: string, requirementIds: readonly string[]): GateError[] {
  const errors: GateError[] = [];
  const headings = parseHeadings(body);
  const headingTexts = new Set(headings.map((h) => h.text));

  for (const section of REQUIRED_SECTIONS) {
    if (!headingTexts.has(section)) {
      errors.push({
        artifact: ARTIFACT,
        field: section,
        rule: 'section.missing',
        detail: `Missing required section. Add a heading whose text is exactly "${section}".`,
      });
    }
  }

  // ---- Requirements: one EARS criterion per requirement, not N in aggregate.
  const requirementsIndex = headings.findIndex((h) => h.text === 'requirements');
  const declared = new Set(requirementIds.map((id) => id.toUpperCase()));
  const found = new Set<string>();

  if (requirementsIndex !== -1) {
    const requirementsSection = sectionBody(body, headings, requirementsIndex);
    const localHeadings = parseHeadings(requirementsSection);

    for (const [index, heading] of localHeadings.entries()) {
      const idMatch = REQUIREMENT_HEADING.exec(heading.text);
      if (!idMatch) continue;
      const id = idMatch[1]!.toUpperCase();
      found.add(id);

      const block = sectionBody(requirementsSection, localHeadings, index);
      if (!EARS.test(block)) {
        errors.push({
          artifact: ARTIFACT,
          field: id,
          rule: 'ears.missing',
          detail:
            `Requirement ${id} has no EARS acceptance criterion of its own. ` +
            `Add a line of the form "WHEN <condition>, THE SYSTEM SHALL <observable behaviour>." ` +
            `inside the ${id} block.`,
        });
      }
    }
  }

  for (const id of declared) {
    if (!found.has(id)) {
      errors.push({
        artifact: ARTIFACT,
        field: `frontmatter.requirement_ids.${id}`,
        rule: 'traceability.undefined_requirement',
        detail: `${id} is declared in the frontmatter but has no heading in the Requirements section.`,
      });
    }
  }

  for (const id of found) {
    if (!declared.has(id)) {
      errors.push({
        artifact: ARTIFACT,
        field: id,
        rule: 'traceability.undeclared_requirement',
        detail: `${id} is specified in the body but missing from frontmatter.requirement_ids.`,
      });
    }
  }

  // ---- Tasks: every task cites the requirement it serves.
  const tasksIndex = headings.findIndex((h) => h.text === 'tasks');
  if (tasksIndex !== -1) {
    const tasksSection = sectionBody(body, headings, tasksIndex);
    const items = [...tasksSection.matchAll(LIST_ITEM)].map((m) => m[1]!.trim()).filter(Boolean);

    if (items.length === 0) {
      errors.push({
        artifact: ARTIFACT,
        field: 'tasks',
        rule: 'tasks.empty',
        detail: 'The Tasks section contains no task items.',
      });
    }

    for (const item of items) {
      const cited = item.match(REQUIREMENT_ID) ?? [];
      if (cited.length === 0) {
        errors.push({
          artifact: ARTIFACT,
          field: 'tasks',
          rule: 'tasks.missing_requirement_ref',
          detail: `Task "${item.slice(0, 70)}" cites no requirement. Every task names the R# it serves.`,
        });
        continue;
      }
      for (const id of cited) {
        if (!declared.has(id.toUpperCase())) {
          errors.push({
            artifact: ARTIFACT,
            field: 'tasks',
            rule: 'tasks.unknown_requirement_ref',
            detail: `Task "${item.slice(0, 70)}" cites ${id}, which is not a declared requirement.`,
          });
        }
      }
    }
  }

  return errors;
}
