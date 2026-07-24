/**
 * The three-layer interpolation engine.
 *
 *   {{name}}                  build-time variable, from variables.yaml
 *   {name}                    build-time section include, or a declared runtime placeholder
 *   {% if cond %}…{% endif %} build-time conditional
 *
 * Everything resolves at render time. Anything left unresolved that was not
 * explicitly declared as a runtime placeholder is a hard error — `prompts 2`
 * warns and ships the prompt anyway, which is how nine dead references and an
 * unsubstituted `{{test-lakshya}}` reached production.
 *
 * Substitution runs over the whole template, including inside code spans, so a
 * prompt can write `` `{{memory_root}}` `` and get the real path. Code spans are
 * masked only for the final unresolved-placeholder check, so a JSON or shell
 * sample containing braces is not mistaken for a dangling reference.
 *
 * The consequence, which is deliberate but sharp: **a registered section name
 * written inside a code fence still expands.** A prompt documenting this very
 * syntax cannot show a literal `{constitution}` in an example — it would inline
 * the whole section. Use a name that is not registered, or describe it in prose.
 * Substituting everywhere and checking only outside code is the tradeoff that
 * makes the common case (a variable inside backticks) work; pinned by test.
 */

export class RenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RenderError';
  }
}

export interface RenderInput {
  text: string;
  variables: Record<string, string>;
  /** Section name -> raw section body. */
  sections: Record<string, string>;
  /** Placeholders deliberately left for per-session substitution. */
  runtimeVariables?: readonly string[];
  /** Identifier used in error messages, e.g. the source file path. */
  origin: string;
}

// `(?<!\$)` keeps `${shellVar}` in a code sample from looking like a reference.
const SECTION_REF = /(?<!\$)\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const BUILD_VAR = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
const CONDITIONAL = /\{%\s*if\s+([^%]+?)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;
// Deliberately looser than BUILD_VAR so that a malformed name — `{{a-b}}`, the
// exact shape that shipped unnoticed in `prompts 2` — is still caught.
const ANY_BUILD_VAR = /\{\{[^{}]*\}\}/g;
const CODE_SPAN = /```[\s\S]*?```|`[^`\n]*`/g;
const MAX_PASSES = 12;

/**
 * Inline section references depth-first. `stack` carries the include chain so a
 * cycle reports its full path rather than blowing the stack.
 */
function expandSections(
  text: string,
  sections: Record<string, string>,
  stack: readonly string[],
  origin: string,
): string {
  return text.replace(SECTION_REF, (match, name: string) => {
    const body = sections[name];
    if (body === undefined) return match; // may be a runtime placeholder; checked later
    if (stack.includes(name)) {
      throw new RenderError(
        `${origin}: section include cycle: ${[...stack, name].join(' -> ')}`,
      );
    }
    return expandSections(body, sections, [...stack, name], origin);
  });
}

/**
 * Evaluate one conditional expression. The grammar is deliberately tiny —
 * truthiness, equality, inequality, set membership. Anything more belongs in
 * code, not in a prompt template.
 */
function evaluateCondition(
  expression: string,
  variables: Record<string, string>,
  origin: string,
): boolean {
  const equality = /^([A-Za-z_][A-Za-z0-9_]*)\s*(==|!=)\s*"([^"]*)"$/.exec(expression);
  if (equality) {
    const name = equality[1]!;
    const operator = equality[2]!;
    const expected = equality[3]!;
    const actual = variables[name] ?? '';
    return operator === '==' ? actual === expected : actual !== expected;
  }

  const membership = /^([A-Za-z_][A-Za-z0-9_]*)\s+in\s+\[(.*)\]$/.exec(expression);
  if (membership) {
    const options = [...membership[2]!.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
    return options.includes(variables[membership[1]!] ?? '');
  }

  const truthy = /^([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  if (truthy) {
    const value = variables[truthy[1]!];
    return value !== undefined && value !== '';
  }

  throw new RenderError(
    `${origin}: unsupported conditional \`{% if ${expression} %}\`. ` +
      `Supported forms: \`NAME\`, \`NAME == "v"\`, \`NAME != "v"\`, \`NAME in ["a","b"]\`.`,
  );
}

function applyConditionals(
  text: string,
  variables: Record<string, string>,
  origin: string,
): string {
  return text.replace(CONDITIONAL, (_match, expression: string, body: string) => {
    if (/\{%\s*if\s/.test(body)) {
      throw new RenderError(
        `${origin}: nested conditionals are not supported (in \`{% if ${expression} %}\`). ` +
          `Extract the inner branch into a section instead.`,
      );
    }
    return evaluateCondition(expression.trim(), variables, origin) ? body : '';
  });
}

function applyVariables(text: string, variables: Record<string, string>): string {
  return text.replace(BUILD_VAR, (match, name: string) => variables[name] ?? match);
}

/**
 * Reject anything still unresolved that was not declared as a runtime
 * placeholder. Code spans are stripped first so that examples containing braces
 * do not produce false failures.
 */
function assertFullyResolved(
  text: string,
  runtimeVariables: readonly string[],
  origin: string,
): void {
  const prose = text.replace(CODE_SPAN, ' ');

  const danglingVars = [...new Set(prose.match(ANY_BUILD_VAR) ?? [])];
  if (danglingVars.length > 0) {
    throw new RenderError(
      `${origin}: undefined build-time variable(s): ${danglingVars.join(', ')}. ` +
        `Define them in variables.yaml or remove the reference.`,
    );
  }

  const declared = new Set(runtimeVariables);
  const undeclared = [
    ...new Set([...prose.matchAll(SECTION_REF)].map((m) => m[1]!)),
  ].filter((name) => !declared.has(name));

  if (undeclared.length > 0) {
    throw new RenderError(
      `${origin}: unresolved placeholder(s): ${undeclared.map((n) => `{${n}}`).join(', ')}. ` +
        `Register a section with that name, declare it under runtime_variables, or remove it.`,
    );
  }
}

export function render(input: RenderInput): string {
  const { variables, sections, origin } = input;
  const runtimeVariables = input.runtimeVariables ?? [];

  let text = input.text;

  // Fixed point: sections may contain variables, variables may contain
  // conditionals, and so on. Iterate until stable rather than fixing an order.
  let passes = 0;
  for (;;) {
    const before = text;
    text = expandSections(text, sections, [], origin);
    text = applyConditionals(text, variables, origin);
    text = applyVariables(text, variables);
    if (text === before) break;
    if (++passes >= MAX_PASSES) {
      throw new RenderError(
        `${origin}: interpolation did not converge after ${MAX_PASSES} passes — ` +
          `likely a variable whose value references itself.`,
      );
    }
  }

  assertFullyResolved(text, runtimeVariables, origin);
  return text.trim();
}
