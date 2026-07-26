import { describe, expect, it } from 'vitest';
import { render, RenderError } from '../src/render.js';

const base = {
  variables: {} as Record<string, string>,
  sections: {} as Record<string, string>,
  origin: 'test.md',
};

describe('build-time variables', () => {
  it('substitutes a defined variable', () => {
    expect(
      render({ ...base, text: 'root is {{memory_root}}', variables: { memory_root: '/mnt/m' } }),
    ).toBe('root is /mnt/m');
  });

  // Regression: masking code spans before substitution meant a variable inside
  // backticks silently shipped unsubstituted, and the unresolved check could not
  // see it either because it ran on the masked text.
  it('substitutes a variable inside an inline code span', () => {
    expect(
      render({ ...base, text: 'see `{{memory_root}}/brief.json`', variables: { memory_root: '/mnt/m' } }),
    ).toBe('see `/mnt/m/brief.json`');
  });

  it('substitutes a variable inside a fenced code block', () => {
    const text = '```\ncat {{memory_root}}/state.json\n```';
    expect(render({ ...base, text, variables: { memory_root: '/mnt/m' } })).toContain(
      'cat /mnt/m/state.json',
    );
  });

  it('rejects an undefined variable', () => {
    expect(() => render({ ...base, text: 'hello {{nope}}' })).toThrow(
      /undefined build-time variable\(s\): \{\{nope\}\}/,
    );
  });

  // `prompts 2` shipped `{{test-lakshya}}`: unmatchable by the substitution
  // regex and therefore invisible to a check keyed on the same pattern.
  it('rejects a malformed variable name that substitution cannot match', () => {
    expect(() => render({ ...base, text: 'x {{test-lakshya}} y' })).toThrow(
      /undefined build-time variable\(s\): \{\{test-lakshya\}\}/,
    );
  });

  it('resolves a variable whose value references another variable', () => {
    expect(
      render({
        ...base,
        text: '{{outer}}',
        variables: { outer: 'a/{{inner}}', inner: 'b' },
      }),
    ).toBe('a/b');
  });

  it('rejects a self-referential variable rather than looping forever', () => {
    expect(() =>
      render({ ...base, text: '{{loop}}', variables: { loop: 'x {{loop}}' } }),
    ).toThrow(/did not converge/);
  });
});

describe('sections', () => {
  it('inlines a section', () => {
    expect(
      render({ ...base, text: 'A\n{one}\nB', sections: { one: 'MIDDLE' } }),
    ).toBe('A\nMIDDLE\nB');
  });

  it('inlines sections transitively', () => {
    expect(
      render({ ...base, text: '{a}', sections: { a: 'A {b}', b: 'B' } }),
    ).toBe('A B');
  });

  it('reports the full path of an include cycle', () => {
    expect(() =>
      render({ ...base, text: '{a}', sections: { a: '{b}', b: '{a}' } }),
    ).toThrow(/section include cycle: a -> b -> a/);
  });

  it('substitutes variables that arrive via a section body', () => {
    expect(
      render({
        ...base,
        text: '{s}',
        sections: { s: 'path {{p}}' },
        variables: { p: '/tmp' },
      }),
    ).toBe('path /tmp');
  });
});

describe('unresolved placeholders', () => {
  it('rejects an undeclared placeholder', () => {
    expect(() => render({ ...base, text: 'hi {mystery}' })).toThrow(
      /unresolved placeholder\(s\): \{mystery\}/,
    );
  });

  it('preserves a declared runtime placeholder', () => {
    expect(
      render({ ...base, text: 'hi {project}', runtimeVariables: ['project'] }),
    ).toBe('hi {project}');
  });

  it('ignores braces inside a fenced code block', () => {
    const text = 'Example:\n\n```json\n{ "a": 1 }\n```\n\nDone.';
    expect(render({ ...base, text })).toContain('"a": 1');
  });

  it('ignores a bare identifier in braces inside a code span', () => {
    expect(render({ ...base, text: 'call `{handler}` now' })).toBe('call `{handler}` now');
  });

  it('ignores a shell-style interpolation in prose', () => {
    expect(render({ ...base, text: 'set ${HOME} first' })).toBe('set ${HOME} first');
  });

  // Pinning a deliberate sharp edge. Substitution runs everywhere so that a
  // variable inside backticks resolves; the cost is that a *registered* section
  // name inside a fence also expands. A prompt documenting this syntax must not
  // use a real section name in its example.
  it('expands a registered section even inside a code fence', () => {
    expect(
      render({ ...base, text: '```\n{known}\n```', sections: { known: 'EXPANDED' } }),
    ).toBe('```\nEXPANDED\n```');
  });

  it('leaves an unregistered brace token inside a fence alone', () => {
    expect(render({ ...base, text: '```\n{not_a_section}\n```' })).toBe(
      '```\n{not_a_section}\n```',
    );
  });
});

describe('conditionals', () => {
  const variables = { mode: 'fast', empty: '' };

  it('keeps a truthy branch and drops a falsy one', () => {
    expect(render({ ...base, text: '{% if mode %}yes{% endif %}', variables })).toBe('yes');
    expect(render({ ...base, text: '{% if empty %}yes{% endif %}', variables })).toBe('');
    expect(render({ ...base, text: '{% if absent %}yes{% endif %}', variables })).toBe('');
  });

  it('supports equality and inequality', () => {
    expect(render({ ...base, text: '{% if mode == "fast" %}F{% endif %}', variables })).toBe('F');
    expect(render({ ...base, text: '{% if mode == "slow" %}S{% endif %}', variables })).toBe('');
    expect(render({ ...base, text: '{% if mode != "slow" %}N{% endif %}', variables })).toBe('N');
  });

  it('supports set membership', () => {
    expect(
      render({ ...base, text: '{% if mode in ["fast","slow"] %}M{% endif %}', variables }),
    ).toBe('M');
    expect(render({ ...base, text: '{% if mode in ["slow"] %}M{% endif %}', variables })).toBe('');
  });

  it('rejects nesting rather than mis-parsing it', () => {
    expect(() =>
      render({
        ...base,
        text: '{% if a %}x{% if b %}y{% endif %}{% endif %}',
        variables: { a: '1', b: '1' },
      }),
    ).toThrow(/nested conditionals are not supported/);
  });

  it('rejects an unsupported condition form', () => {
    expect(() => render({ ...base, text: '{% if a > 3 %}x{% endif %}' })).toThrow(
      RenderError,
    );
  });
});
