import type { Pack } from './types.js';

/**
 * Generate the selector section handed to an agent that must choose which
 * capability packs apply.
 *
 * Generated, never hand-written. In the reference repository the equivalent list
 * lives inside a 1,200-line prompt maintained by hand, so the catalogue and the
 * thing that selects from it drift apart silently. Deriving it from the registry
 * makes that class of bug impossible: a pack that exists is offered, and a pack
 * that does not, is not.
 */
export function renderSelector(packs: readonly Pack[]): string {
  const live = packs.filter((pack) => pack.enabled);

  if (live.length === 0) {
    return [
      '<capability_packs>',
      'No capability packs are currently registered. Build from first principles',
      'and the spec.',
      '</capability_packs>',
      '',
    ].join('\n');
  }

  const byCategory = new Map<string, Pack[]>();
  for (const pack of live) {
    byCategory.set(pack.category, [...(byCategory.get(pack.category) ?? []), pack]);
  }

  const lines: string[] = [
    '<capability_packs>',
    'Verified implementation knowledge is available for the areas below. When a',
    'pack matches the task, request it by name and follow it — it encodes',
    'decisions already validated in production, and re-deriving them from scratch',
    'is both slower and more likely to be wrong.',
    '',
    'Match on the criteria, not on the title. A pack whose anti-criteria apply',
    'does not match, however relevant the name sounds.',
    '',
  ];

  for (const category of [...byCategory.keys()].sort()) {
    lines.push(`## ${category}`, '');
    for (const pack of byCategory.get(category)!.sort((a, b) => a.name.localeCompare(b.name))) {
      lines.push(`### ${pack.name} (v${pack.version}) — ${pack.title}`, '');
      lines.push(pack.summary, '');
      lines.push('Use when:');
      for (const criterion of pack.matching_criteria) lines.push(`- ${criterion}`);
      if (pack.anti_criteria?.length) {
        lines.push('', 'Do NOT use when:');
        for (const criterion of pack.anti_criteria) lines.push(`- ${criterion}`);
      }
      if (pack.requires_secrets?.length) {
        lines.push(
          '',
          `Requires configuration: ${pack.requires_secrets.map((s) => `\`${s}\``).join(', ')}. ` +
            `If any is absent, say so rather than inventing a value.`,
        );
      }
      lines.push('');
    }
  }

  lines.push('</capability_packs>', '');
  return lines.join('\n');
}

/** Testing guidance contributed by whichever packs are in play. */
export function renderTestingInstructions(packs: readonly Pack[]): string {
  const contributions = packs
    .filter((pack) => pack.enabled && pack.testing_instructions)
    .map((pack) => `- **${pack.name}**: ${pack.testing_instructions!.trim()}`);

  if (contributions.length === 0) return '';

  return ['<pack_testing_instructions>', ...contributions, '</pack_testing_instructions>', ''].join(
    '\n',
  );
}
