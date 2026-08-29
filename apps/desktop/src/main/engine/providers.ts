/**
 * The provider layer — Power's answer to "route away from the meter."
 *
 * The insight, borrowed from OmniRoute and made honest for a gated product:
 * Claude Code (and therefore Power's headless `claude` dispatch) will talk to
 * ANY Anthropic-compatible endpoint if you set two environment variables —
 * `ANTHROPIC_BASE_URL` and `ANTHROPIC_AUTH_TOKEN`. That single hook is all it
 * takes to send a stage to a local gateway (your own OmniRoute on :20128), to a
 * cheaper managed provider you hold a key for, or to nothing at all — the
 * built-in default, which is your existing Claude login and changes nothing.
 *
 * What Power adds on top is a router with a QUALITY FLOOR. A run's output is
 * only as trustworthy as its gates, and a gate cannot pass work a weak model
 * produced. So a cheap provider is trusted, by default, only with the roles
 * where a miss is cheap and self-correcting — the researcher and the documenter
 * — while the architect, implementer, reviewer, tester and verifier stay on the
 * provider you trust unless you explicitly widen the floor. Cost goes down
 * where it is safe to; the product's promise stays intact where it is not.
 *
 * Power itself bundles no third-party free tiers and ships no anonymous
 * providers: the only provider that exists until you add one is your own Claude
 * login. Pointing a role at a gateway is a choice you make, on your machine,
 * with an endpoint you run — never something the product does to your customers
 * on their behalf.
 */
import type { Role } from './types.js';

export type ProviderKind = 'claude-cli' | 'gateway';

export interface Provider {
  /** Stable id; 'claude' is the reserved built-in default. */
  id: string;
  /** Human label for the UI. */
  label: string;
  kind: ProviderKind;
  /** Gateway only: the Anthropic-compatible base URL, e.g. http://127.0.0.1:20128 */
  baseUrl?: string;
  /**
   * Gateway only: the token the gateway expects. Stored in the app's own
   * config, never sent anywhere but the local spawn's environment. A gateway
   * that needs no token (a bare local instance) leaves this empty.
   */
  authToken?: string;
  /**
   * The quality floor: the roles this provider is trusted to serve. The router
   * will only route a role here if it appears in this list. Empty = never auto-
   * selected (the provider exists but is parked).
   */
  allowRoles: Role[];
  /**
   * Routing weight — lower wins. 0 means free. The built-in Claude default is
   * deliberately mid-weight so a configured cheaper provider is preferred for
   * the roles it is trusted with, and Claude still wins ties for everything else.
   */
  costWeight: number;
  /**
   * Optional per-role model override sent as `--model`. A gateway that fronts,
   * say, DeepSeek or a free Gemini pool names the model it wants here; omitted,
   * the stage's normal model name is passed through and the gateway maps it.
   */
  models?: Partial<Record<Role, string>>;
}

/** The built-in default: your Claude CLI login, trusted with every role, no env
 * override, no token stored. This is what a fresh Power run has always used. */
export const CLAUDE_DEFAULT: Provider = {
  id: 'claude',
  label: 'Claude (your login)',
  kind: 'claude-cli',
  allowRoles: [
    'researcher',
    'architect',
    'implementer',
    'reviewer',
    'tester',
    'verifier',
    'documenter',
  ],
  costWeight: 10,
};

/** OmniRoute's documented default port. Detection probes here; the user can
 * point at any other Anthropic-compatible endpoint instead. */
export const OMNIROUTE_DEFAULT_BASE = 'http://127.0.0.1:20128';

/** The roles it is safe to route to a cheap/unproven provider by default: a
 * miss here is caught by a later gate or is low-stakes prose, and re-running
 * one is cheap. Everything a gate directly grades, or that writes code, stays
 * on the trusted default until the user widens the floor themselves. */
export const SAFE_CHEAP_ROLES: Role[] = ['researcher', 'documenter'];

/**
 * Choose the provider for one role. Among providers that (a) list this role in
 * their quality floor and (b) are enabled, the lowest cost weight wins; the
 * built-in default is always a candidate, so a role no cheap provider is
 * trusted with simply stays on Claude. Pure and total — never throws, always
 * returns a provider.
 */
export function chooseProvider(role: Role, providers: Provider[]): Provider {
  const pool = [CLAUDE_DEFAULT, ...providers.filter((p) => p.id !== 'claude')];
  const eligible = pool.filter((p) => p.allowRoles.includes(role));
  if (eligible.length === 0) return CLAUDE_DEFAULT;
  return eligible.reduce((best, p) => (p.costWeight < best.costWeight ? p : best));
}

/**
 * The environment overlay a provider needs. The built-in Claude default adds
 * nothing (the CLI uses your normal login); a gateway adds exactly the two vars
 * Claude Code reads to redirect its traffic. This overlay is merged onto the
 * child's env for that one dispatch only — it never leaks into the app process.
 */
export function providerEnv(p: Provider): Record<string, string> {
  if (p.kind !== 'gateway' || !p.baseUrl) return {};
  const env: Record<string, string> = { ANTHROPIC_BASE_URL: normalizeBaseUrl(p.baseUrl) };
  if (p.authToken) env.ANTHROPIC_AUTH_TOKEN = p.authToken;
  return env;
}

/** Claude Code wants the base URL without a trailing slash and without a
 * trailing `/v1` (it appends the version itself). OmniRoute's dashboard hands
 * out `…:20128/v1`; we accept either and normalize. */
export function normalizeBaseUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (url.endsWith('/v1')) url = url.slice(0, -3);
  return url;
}

/**
 * Probe an endpoint to see if a gateway is actually listening. Used to offer a
 * running OmniRoute as a provider without the user having to know its port. A
 * short timeout keeps a run's preflight snappy; any reachable HTTP response
 * (even 401/404) proves something is there to talk to.
 */
export async function detectGateway(
  baseUrl = OMNIROUTE_DEFAULT_BASE,
  timeoutMs = 800,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(normalizeBaseUrl(baseUrl), {
      method: 'GET',
      signal: controller.signal,
    });
    return res.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Conservative, lossless brief compaction — the safe half of "token
 * compression." It never rewrites or summarizes instructions to a coding agent
 * (that is how you corrupt a run to save pennies); it only removes what carries
 * no signal: trailing whitespace, runs of blank lines, and exact consecutive
 * duplicate lines. Returns the compacted lines and the characters saved, so the
 * saving shown to the user is measured, not claimed.
 */
export function compactBrief(lines: string[]): { lines: string[]; savedChars: number } {
  const before = lines.join('\n').length;
  const out: string[] = [];
  let blanks = 0;
  for (const raw of lines) {
    const line = raw.replace(/[ \t]+$/, '');
    if (line.trim() === '') {
      blanks += 1;
      if (blanks > 1) continue;
    } else {
      blanks = 0;
    }
    if (out.length > 0 && out[out.length - 1] === line && line.trim() !== '') continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1]!.trim() === '') out.pop();
  const after = out.join('\n').length;
  return { lines: out, savedChars: Math.max(0, before - after) };
}
