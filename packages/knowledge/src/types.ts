/**
 * Capability packs — reusable, versioned implementation knowledge injected into
 * an agent's context when the task calls for it.
 *
 * This is the `playbook` idea from the reference prompt repository, with the
 * metadata it lacks. There, a pack carries only a description, a file, a type,
 * and a price; the *matching criteria* that decide when to use it live in
 * 1,200 lines of prose inside a separate selector prompt. Registry and selector
 * are therefore out of sync by construction — adding a pack does not make it
 * selectable, and deleting one does not stop it being offered.
 *
 * Here the matching criteria are part of the pack, and the selector is
 * generated from the registry. They cannot drift.
 */

export type PackCategory = 'integration' | 'design' | 'infrastructure' | 'compliance';

export interface PackSource {
  name: string;
  title: string;
  version: number;
  category: PackCategory;
  owner: string;
  enabled?: boolean;
  summary: string;
  /** Natural-language conditions under which this pack applies. */
  matching_criteria: string[];
  /** Conditions under which it explicitly does not, to stop over-triggering. */
  anti_criteria?: string[];
  /** Environment variables the pack's guidance assumes exist. */
  requires_secrets?: string[];
  /** Packs this one supersedes; a superseded pack may not also be enabled. */
  deprecates?: string[];
  /** Markdown body, relative to the packs directory. */
  content: string;
  /** Extra instructions handed to the tester when this pack is in play. */
  testing_instructions?: string;
  tags?: string[];
}

export interface Pack extends Omit<PackSource, 'enabled'> {
  enabled: boolean;
  /** The rendered markdown body. */
  body: string;
}

export class PackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackError';
  }
}
