'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Copy-to-clipboard, ported from the reference's `Connect.jsx`.
 *
 * The install commands are the whole call to action, so this has to be right:
 * the clipboard API is unavailable on insecure origins and can be denied, and
 * silently doing nothing would leave the reader thinking they had copied
 * something. On failure it says so.
 */
export function CopyButton({ text, dark = true }: { text: string; dark?: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 1600);
  };

  const theme = dark
    ? 'border-white/15 text-white/70 hover:text-white hover:border-white/30'
    : 'border-hairline text-mutedtext hover:text-ink hover:border-mutedtext';

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy ${text}`}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${theme}`}
    >
      {state === 'copied' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Press ⌘C' : 'Copy'}
    </button>
  );
}

/** A dark terminal block with a copy affordance. */
export function CodeBlock({ code, label = 'shell' }: { code: string; label?: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[10px] border border-hairline bg-code text-left">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="font-mono text-[11px] text-white/40">{label}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed text-white/85">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Numbered steps on a hairline spine. */
export function StepList({ steps }: { steps: readonly string[] }) {
  return (
    <ol className="relative">
      <span className="absolute top-3 bottom-3 left-[13px] w-px bg-hairline" aria-hidden="true" />
      {steps.map((step, i) => (
        <li key={step} className="relative flex gap-4 pb-5 last:pb-0">
          <span className="relative z-10 grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full border border-hairline bg-surface text-xs text-mutedtext">
            {i + 1}
          </span>
          <span className="pt-1 text-base leading-relaxed text-bodytext">{step}</span>
        </li>
      ))}
    </ol>
  );
}
