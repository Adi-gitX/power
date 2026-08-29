import { describe, it, expect } from 'vitest';
import {
  CLAUDE_DEFAULT,
  SAFE_CHEAP_ROLES,
  chooseProvider,
  providerEnv,
  normalizeBaseUrl,
  compactBrief,
  type Provider,
} from '../src/main/engine/providers.js';

const gateway: Provider = {
  id: 'omniroute',
  label: 'OmniRoute (local)',
  kind: 'gateway',
  baseUrl: 'http://127.0.0.1:20128/v1',
  authToken: 'sk-local',
  allowRoles: [...SAFE_CHEAP_ROLES],
  costWeight: 0,
};

describe('provider router', () => {
  it('routes a trusted cheap role to the cheaper gateway', () => {
    expect(chooseProvider('researcher', [gateway]).id).toBe('omniroute');
    expect(chooseProvider('documenter', [gateway]).id).toBe('omniroute');
  });

  it('keeps every high-stakes role on the trusted default by the quality floor', () => {
    for (const role of ['architect', 'implementer', 'reviewer', 'tester', 'verifier'] as const) {
      expect(chooseProvider(role, [gateway]).id).toBe('claude');
    }
  });

  it('honours a widened floor when the user opts a role in', () => {
    const wide = { ...gateway, allowRoles: [...gateway.allowRoles, 'implementer' as const] };
    expect(chooseProvider('implementer', [wide]).id).toBe('omniroute');
  });

  it('never throws and always returns a provider, even with none configured', () => {
    expect(chooseProvider('implementer', []).id).toBe('claude');
    expect(chooseProvider('researcher', []).id).toBe('claude');
  });

  it('the default alone serves every role — the pre-feature behaviour', () => {
    for (const role of CLAUDE_DEFAULT.allowRoles) {
      expect(chooseProvider(role, []).id).toBe('claude');
    }
  });

  it('lowest cost weight wins among eligible providers', () => {
    const pricier = { ...gateway, id: 'other', label: 'Other', costWeight: 5 };
    const chosen = chooseProvider('researcher', [pricier, gateway]);
    expect(chosen.id).toBe('omniroute'); // weight 0 beats 5
  });
});

describe('gateway env hook', () => {
  it('the built-in default injects NOTHING — your normal login, untouched', () => {
    expect(providerEnv(CLAUDE_DEFAULT)).toEqual({});
  });

  it('a gateway injects exactly the two Claude Code redirect vars', () => {
    const env = providerEnv(gateway);
    expect(env).toEqual({
      ANTHROPIC_BASE_URL: 'http://127.0.0.1:20128',
      ANTHROPIC_AUTH_TOKEN: 'sk-local',
    });
  });

  it('strips a trailing /v1 and slashes — Claude Code appends the version itself', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:20128/v1')).toBe('http://127.0.0.1:20128');
    expect(normalizeBaseUrl('http://host:9/v1/')).toBe('http://host:9');
    expect(normalizeBaseUrl('http://host:9')).toBe('http://host:9');
  });

  it('a tokenless gateway omits the auth var', () => {
    const env = providerEnv({ ...gateway, authToken: undefined });
    expect(env).toEqual({ ANTHROPIC_BASE_URL: 'http://127.0.0.1:20128' });
    expect(env).not.toHaveProperty('ANTHROPIC_AUTH_TOKEN');
  });
});

describe('brief compaction (lossless)', () => {
  it('collapses blank runs and trailing whitespace without touching content', () => {
    const { lines, savedChars } = compactBrief([
      'Fix the gate violations:   ',
      '',
      '',
      '',
      '- rule A',
      '- rule A',
      '  ',
    ]);
    expect(lines).toEqual(['Fix the gate violations:', '', '- rule A']);
    expect(savedChars).toBeGreaterThan(0);
  });

  it('is a no-op on already-tight input', () => {
    const input = ['line one', '', 'line two'];
    const { lines, savedChars } = compactBrief(input);
    expect(lines).toEqual(input);
    expect(savedChars).toBe(0);
  });

  it('never drops distinct instruction lines', () => {
    const input = ['- do X', '- do Y', '- do Z'];
    expect(compactBrief(input).lines).toEqual(input);
  });
});
