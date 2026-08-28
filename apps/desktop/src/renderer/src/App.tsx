import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  CircleAlert,
  FolderOpen,
  Loader2,
  OctagonX,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { gsap } from 'gsap';
import { Intro } from './Intro';

type StageId =
  | 'init'
  | 'research'
  | 'spec'
  | 'approval'
  | 'implement'
  | 'review'
  | 'test'
  | 'verify'
  | 'document'
  | 'done';

interface PowerEvent {
  type: string;
  [key: string]: unknown;
}

interface HistoryRow {
  goal: string;
  repoDir: string;
  at: string;
  outcome?: string;
  costUsd?: number;
}

interface RunFeatures {
  tier: 'auto' | 'eco' | 'balanced' | 'max';
  research: boolean;
  reviewTest: boolean;
  docs: boolean;
  autoApprove: boolean;
  packs: boolean;
}

const DEFAULT_FEATURES: RunFeatures = {
  tier: 'auto',
  research: true,
  reviewTest: true,
  docs: true,
  autoApprove: false,
  packs: false,
};

function loadFeatures(): RunFeatures {
  try {
    return { ...DEFAULT_FEATURES, ...JSON.parse(localStorage.getItem('power.options') ?? '{}') };
  } catch {
    return DEFAULT_FEATURES;
  }
}

/** What a run is NOT doing, for the header — a cheap run must look cheap. */
function offSummary(f: RunFeatures): string {
  const off: string[] = [];
  if (!f.research) off.push('no research');
  if (!f.reviewTest) off.push('no review/test');
  if (!f.docs) off.push('no docs');
  if (f.autoApprove) off.push('auto-approve');
  if (f.tier !== 'auto') off.push(f.tier);
  return off.join(' · ');
}

declare global {
  interface Window {
    power: {
      pickRepo(): Promise<string | null>;
      history(): Promise<HistoryRow[]>;
      startRun(
        repo: string,
        goal: string,
        features?: RunFeatures,
      ): Promise<{ ok: boolean; error?: string }>;
      approve(): Promise<void>;
      reject(reason: string): Promise<void>;
      stop(): Promise<void>;
      hide(): Promise<void>;
      authStatus(): Promise<{ cliFound: boolean; loggedIn: boolean; email?: string }>;
      authLogin(): Promise<boolean>;
      readArtifact(repo: string, name: string): Promise<string | null>;
      onEvent(handler: (event: PowerEvent) => void): () => void;
    };
  }
}

const STAGES: { id: StageId; label: string }[] = [
  { id: 'research', label: 'research' },
  { id: 'spec', label: 'spec' },
  { id: 'approval', label: 'approval' },
  { id: 'implement', label: 'implement' },
  { id: 'review', label: 'review' },
  { id: 'test', label: 'test' },
  { id: 'verify', label: 'verify' },
  { id: 'document', label: 'document' },
];

type StageStatus = 'pending' | 'running' | 'pass' | 'fail';

/**
 * The run reads as a conversation: your goal as the opening message, then one
 * activity card per stage appearing as it starts — the ChatGPT-search pattern,
 * where each step names itself in plain language and its working detail nests
 * underneath, collapsed to a tail while it runs.
 */
const CARD_META: Record<string, { title: string; doing: string }> = {
  research: { title: 'Research', doing: 'Researching the problem' },
  spec: { title: 'Spec', doing: 'Writing the spec' },
  approval: { title: 'Approval', doing: 'Waiting for your review' },
  implement: { title: 'Implement', doing: 'Implementing' },
  review: { title: 'Review', doing: 'Reviewing the code' },
  test: { title: 'Test', doing: 'Running tests' },
  verify: { title: 'Verify', doing: 'Verifying acceptance' },
  document: { title: 'Document', doing: 'Writing documentation' },
};

const ROLE_STAGE: Record<string, StageId> = {
  researcher: 'research',
  architect: 'spec',
  implementer: 'implement',
  reviewer: 'review',
  tester: 'test',
  verifier: 'verify',
  documenter: 'document',
};

const GATE_STAGE: Record<string, StageId> = {
  research: 'research',
  spec: 'spec',
  verification: 'verify',
};

const EDGE_STAGE: Record<string, StageId> = {
  research_refetch: 'research',
  spec_revision: 'spec',
  needs_fixes: 'verify',
};

/** One activity card. Mounts with a rise; expands on click. */
function StageCard({
  stage,
  status,
  lines,
  gate,
  retriesUsed,
  usage,
  children,
}: {
  stage: StageId;
  status: StageStatus;
  lines: string[];
  gate?: { pass: boolean } | undefined;
  retriesUsed?: number | undefined;
  usage?: { costUsd: number; turns: number } | undefined;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
    );
  }, []);

  const meta = CARD_META[stage]!;
  const tail = open ? lines : lines.slice(-3);

  return (
    <div
      ref={ref}
      data-card={stage}
      className="w-full rounded-2xl border border-hairline bg-panel/80 px-4 py-3"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 text-left"
      >
        {status === 'running' ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-soft" strokeWidth={2} />
        ) : status === 'fail' ? (
          <OctagonX className="h-4 w-4 shrink-0 text-accent-soft" strokeWidth={2} />
        ) : (
          <Check className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2.5} />
        )}
        <span className="text-[14px] font-medium text-ink">
          {status === 'running' ? `${meta.doing}…` : meta.title}
        </span>
        {gate && (
          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] tracking-wide ${
              gate.pass
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-accent-soft/40 bg-accent-soft/10 text-accent-soft'
            }`}
          >
            gate {gate.pass ? 'PASS' : 'FAIL'}
          </span>
        )}
        {retriesUsed ? (
          <span className="rounded-md border border-hairline bg-canvas/60 px-1.5 py-0.5 font-mono text-[10.5px] text-mutedtext">
            retry {retriesUsed}/2
          </span>
        ) : null}
        {usage && usage.costUsd > 0 ? (
          <span className="rounded-md border border-hairline bg-canvas/60 px-1.5 py-0.5 font-mono text-[10.5px] text-mutedtext">
            ${usage.costUsd.toFixed(2)} · {usage.turns}t
          </span>
        ) : null}
        {lines.length > 3 && (
          <span className="ml-auto shrink-0 text-[11px] text-mutedtext">
            {open ? 'collapse' : `${lines.length} lines`}
          </span>
        )}
      </button>
      {tail.length > 0 && (
        <div className="selectable mt-2 space-y-0.5 border-l border-hairline pl-3">
          {tail.map((line, i) => (
            <p key={i} className="font-mono text-[12px] leading-relaxed break-words text-mutedtext">
              {line}
            </p>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<'intro' | 'app'>('intro');
  const [auth, setAuth] = useState<{
    cliFound: boolean;
    loggedIn: boolean;
    email?: string;
  } | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [view, setView] = useState<'home' | 'run'>('home');
  const [repo, setRepo] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [filter, setFilter] = useState('');
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<Record<string, StageStatus>>({});
  const [gates, setGates] = useState<{ stage: string; pass: boolean }[]>([]);
  const [retries, setRetries] = useState<{ edge: string; used: number }[]>([]);
  const [log, setLog] = useState<{ role: string; line: string }[]>([]);
  const [spec, setSpec] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [features, setFeatures] = useState<RunFeatures>(loadFeatures);
  const [runFeatures, setRunFeatures] = useState<RunFeatures>(DEFAULT_FEATURES);
  const [usage, setUsage] = useState<Record<string, { costUsd: number; turns: number }>>({});
  const [totalCost, setTotalCost] = useState(0);

  const setFeature = (patch: Partial<RunFeatures>) => {
    setFeatures((f) => {
      const next = { ...f, ...patch };
      localStorage.setItem('power.options', JSON.stringify(next));
      return next;
    });
  };
  const logEnd = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const ask = useRef<HTMLTextAreaElement>(null);
  const repoRef = useRef<string | null>(null);
  repoRef.current = repo;

  useEffect(() => {
    // Mock-agent mode is the test harness; it never talks to Claude.
    void window.power.authStatus().then(setAuth);
  }, []);

  useEffect(() => {
    void window.power.history().then(setHistory);
    if (view === 'home' && phase === 'app') {
      // After the entrance settles.
      const id = setTimeout(() => ask.current?.focus(), 350);
      return () => clearTimeout(id);
    }
  }, [view, phase]);

  // The surface breathes in once the intro hands over, then its contents
  // arrive in reading order — sidebar, wordmark, ask box — so the app assembles
  // rather than pops. Raycast's trick, and it costs three tweens.
  useEffect(() => {
    if (phase !== 'app' || !surface.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const q = gsap.utils.selector(surface);
    const tl = gsap.timeline();
    tl.fromTo(
      surface.current,
      { opacity: 0, scale: 0.985, y: 6 },
      { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power3.out' },
    )
      .fromTo(
        q('aside'),
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' },
        '-=0.25',
      )
      .fromTo(
        q('[data-arrive]'),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.08 },
        '-=0.2',
      );
  }, [phase]);

  // Keyboard-first, Raycast-style: Escape puts the window away when nothing
  // needs you; ⌘N starts a fresh session. The window stays resident either way.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'home' && !running) void window.power.hide();
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        setView('home');
        setGoal('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, running]);

  useEffect(() => {
    return window.power.onEvent((e) => {
      switch (e.type) {
        case 'stage': {
          const stage = e.stage as StageId;
          const status = e.status as string;
          setStages((s) => ({
            ...s,
            [stage]: status === 'start' ? 'running' : (status as StageStatus),
          }));
          if (stage === 'done') setRunning(false);
          break;
        }
        case 'agent': {
          const line = String(e.line);
          if (!line.startsWith('{')) {
            setLog((l) => [...l.slice(-499), { role: String(e.role), line }]);
          }
          break;
        }
        case 'gate':
          setGates((g) => [...g, { stage: String(e.stage), pass: Boolean(e.pass) }]);
          break;
        case 'retry':
          setRetries((r) => [...r, { edge: String(e.edge), used: Number(e.used) }]);
          break;
        case 'agent_usage':
          setUsage((u) => ({
            ...u,
            [String(e.role)]: { costUsd: Number(e.costUsd), turns: Number(e.turns) },
          }));
          break;
        case 'run_usage':
          setTotalCost(Number(e.costUsd));
          break;
        case 'needs_approval': {
          const current = repoRef.current;
          if (current) {
            void window.power.readArtifact(current, 'SPEC.md').then((text) => {
              setSpec(text ?? '(SPEC.md missing)');
            });
          }
          break;
        }
        case 'blocked':
          setBlocked(String(e.reason));
          setRunning(false);
          break;
        case 'done':
          setDone(String(e.summary));
          setRunning(false);
          break;
        case 'error':
          setError(String(e.message));
          setRunning(false);
          break;
      }
    });
  }, []);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
  }, [log]);

  const start = async () => {
    let dir = repo;
    if (!dir) {
      dir = await window.power.pickRepo();
      if (!dir) return;
      setRepo(dir);
    }
    if (goal.trim().length < 8) return;
    setStages({});
    setGates([]);
    setRetries([]);
    setLog([]);
    setSpec(null);
    setBlocked(null);
    setDone(null);
    setError(null);
    setUsage({});
    setTotalCost(0);
    setRunFeatures(features);
    const result = await window.power.startRun(dir, goal.trim(), features);
    if (!result.ok) {
      setError(result.error ?? 'could not start');
    } else {
      setRunning(true);
      setView('run');
    }
  };

  const retriesUsed = useMemo(
    () =>
      retries.reduce<Record<string, number>>((acc, r) => {
        acc[r.edge] = Math.max(acc[r.edge] ?? 0, r.used);
        return acc;
      }, {}),
    [retries],
  );

  const visibleHistory = history.filter(
    (h) => !filter || h.goal.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="relative h-full p-2.5">
      {phase === 'intro' && <Intro onDone={() => setPhase('app')} />}

      {phase === 'app' && (
        <div ref={surface} className="surface relative flex h-full overflow-hidden">
          {/* The same ambient warmth as the website: two fixed blooms the
              content sits in front of. Decoration only, so it is aria-hidden
              and cannot intercept a click. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(42rem 30rem at 12% -8%, rgba(201,100,66,0.07), transparent 62%),' +
                'radial-gradient(38rem 28rem at 92% 108%, rgba(201,100,66,0.05), transparent 64%)',
            }}
          />
          {/* ——— Sidebar: a floating panel, Perplexity-style ——— */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-hairline bg-panel/60">
            <div className="titlebar-drag flex h-12 shrink-0 items-center pl-[78px]">
              <span className="font-mono text-[13px] font-semibold tracking-tight text-ink">
                power<span className="text-accent-soft">/</span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-3">
              <button
                type="button"
                onClick={() => {
                  setView('home');
                  setGoal('');
                }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-bodytext transition-colors hover:bg-raised hover:text-ink"
              >
                <Plus className="h-4 w-4" strokeWidth={1.8} />
                New Session
              </button>
              <label className="mt-1 flex items-center gap-2.5 rounded-lg border border-hairline bg-canvas/60 px-2.5 py-2">
                <Search className="h-3.5 w-3.5 text-mutedtext" strokeWidth={1.8} />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search sessions…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-mutedtext focus:outline-none"
                />
              </label>
            </div>

            <p className="px-5 pt-5 pb-1.5 text-[11px] font-semibold tracking-wide text-mutedtext">
              Recent
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              {visibleHistory.length === 0 && (
                <p className="px-2.5 py-2 text-[13px] text-mutedtext">No runs yet.</p>
              )}
              {visibleHistory.map((h, i) => (
                <button
                  key={`${h.at}-${i}`}
                  type="button"
                  title={`${h.goal}\n${h.repoDir}`}
                  onClick={() => {
                    setGoal(h.goal);
                    setRepo(h.repoDir);
                    setView('home');
                  }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-raised"
                >
                  <span className="block truncate text-[13px] text-bodytext">{h.goal}</span>
                  {(h.outcome || h.costUsd) && (
                    <span className="block text-[10.5px] text-mutedtext">
                      {h.outcome ?? ''}
                      {h.costUsd ? ` · $${h.costUsd.toFixed(2)}` : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-t border-hairline px-4 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-hairline bg-raised font-mono text-[11px] text-ink">
                /
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-bodytext">
                {repo ? repo.split('/').slice(-1)[0] : 'No repository'}
                {auth?.email && (
                  <span className="block truncate text-[11px] text-mutedtext">{auth.email}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => void window.power.pickRepo().then((r) => r && setRepo(r))}
                aria-label="Choose repository"
                className="ml-auto grid h-7 w-7 place-items-center rounded-md text-mutedtext transition-colors hover:bg-raised hover:text-ink"
              >
                <FolderOpen className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </div>
          </aside>

          {/* ——— Main pane ——— */}
          <main className="relative flex min-w-0 flex-1 flex-col">
            <div className="titlebar-drag flex h-12 shrink-0 items-center gap-2.5 border-b border-hairline px-4">
              {view === 'run' ? (
                <>
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      blocked || error
                        ? 'bg-accent-soft'
                        : done
                          ? 'bg-emerald-400'
                          : 'animate-pulse bg-accent-soft'
                    }`}
                  />
                  <span className="truncate text-[13px] font-medium text-ink">{goal}</span>
                  {offSummary(runFeatures) && (
                    <span className="hidden shrink-0 rounded-md border border-hairline bg-canvas/60 px-2 py-0.5 text-[11px] text-mutedtext lg:block">
                      {offSummary(runFeatures)}
                    </span>
                  )}
                  {totalCost > 0 && (
                    <span className="shrink-0 font-mono text-[12px] text-mutedtext">
                      ${totalCost.toFixed(2)}
                    </span>
                  )}
                  {repo && (
                    <span className="hidden shrink-0 rounded-md border border-hairline bg-canvas/60 px-2 py-0.5 font-mono text-[11px] text-mutedtext md:block">
                      {repo.split('/').slice(-1)[0]}
                    </span>
                  )}
                  <span className="shrink-0 text-[12px] text-mutedtext">
                    {error ? 'error' : blocked ? 'blocked' : done ? 'complete' : 'running'}
                  </span>
                  {running && (
                    <button
                      type="button"
                      onClick={() => void window.power.stop()}
                      className="shrink-0 rounded-md border border-accent-soft/50 bg-accent-soft/10 px-2.5 py-1 text-[12px] font-medium text-accent-soft transition-colors hover:bg-accent-soft/20"
                    >
                      Stop
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setView('home');
                      setGoal('');
                    }}
                    className="ml-auto shrink-0 rounded-md border border-hairline bg-panel px-2.5 py-1 text-[12px] font-medium text-bodytext transition-colors hover:bg-raised hover:text-ink"
                  >
                    New Session ⌘N
                  </button>
                </>
              ) : (
                <span className="ml-auto text-[11px] text-mutedtext/70">⌘⇧Space · Esc</span>
              )}
            </div>

            {view === 'home' && auth && !auth.loggedIn && (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 pb-24">
                <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M40.5 14 L29 50" stroke="#f4f2ee" strokeWidth="7.5" strokeLinecap="round" fill="none" />
                  <circle cx="20" cy="46" r="5.5" fill="#c96442" />
                </svg>
                <div className="text-center">
                  <h1 className="display text-4xl text-ink">Connect Claude</h1>
                  <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-mutedtext">
                    Power runs on your own Claude account — the same sign-in the Claude
                    Code extension uses. Your credentials stay in Claude&rsquo;s keychain;
                    this app never sees them.
                  </p>
                </div>
                {auth.cliFound ? (
                  <button
                    type="button"
                    disabled={signingIn}
                    onClick={() => {
                      setSigningIn(true);
                      void window.power.authLogin().then(() => {
                        void window.power.authStatus().then((a) => {
                          setAuth(a);
                          setSigningIn(false);
                        });
                      });
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {signingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        Waiting for the browser…
                      </>
                    ) : (
                      'Sign in with Claude'
                    )}
                  </button>
                ) : (
                  <div className="max-w-sm rounded-xl border border-hairline bg-panel px-4 py-3 text-center text-[13px] leading-relaxed text-bodytext">
                    The <span className="font-mono text-ink">claude</span> CLI was not
                    found. Install Claude Code first —{' '}
                    <span className="font-mono text-ink">npm i -g @anthropic-ai/claude-code</span>{' '}
                    — then relaunch Power.
                  </div>
                )}
              </div>
            )}

            {view === 'home' && (!auth || auth.loggedIn) && (
              <div className="flex flex-1 flex-col items-center justify-center gap-10 px-10 pb-24">
                <h1 data-arrive className="display text-6xl text-ink">
                  power<span className="text-accent-soft">/</span>
                </h1>

                <div
                  data-arrive
                  className="w-full max-w-2xl rounded-2xl border border-hairline bg-panel p-3 shadow-[0_16px_50px_rgba(0,0,0,0.35)] transition-colors focus-within:border-white/20"
                >
                  <textarea
                    ref={ask}
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void start();
                      }
                    }}
                    rows={2}
                    placeholder="Describe what to build…"
                    className="w-full resize-none bg-transparent px-2 pt-1.5 text-[15px] text-ink placeholder:text-mutedtext focus:outline-none"
                  />
                  {/* Options: every chip maps to something the engine honestly
                      does — a skipped stage is recorded as skipped, never faked.
                      Verify and the gates are deliberately not toggleable. */}
                  <div className="flex flex-wrap items-center gap-1.5 px-1 pt-2 pb-1">
                    <div
                      role="radiogroup"
                      aria-label="Model tier"
                      className="mr-1 flex overflow-hidden rounded-lg border border-hairline"
                    >
                      {(['auto', 'eco', 'balanced', 'max'] as const).map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          role="radio"
                          aria-checked={features.tier === tier}
                          onClick={() => setFeature({ tier })}
                          className={`px-2.5 py-1 text-[11.5px] font-medium capitalize transition-colors ${
                            features.tier === tier
                              ? 'bg-raised text-ink'
                              : 'text-mutedtext hover:text-ink'
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                    {(
                      [
                        ['research', 'Research', features.research],
                        ['reviewTest', 'Review + Test', features.reviewTest],
                        ['docs', 'Docs', features.docs],
                        ['autoApprove', 'Auto-approve', features.autoApprove],
                        ['packs', 'Packs', features.packs],
                      ] as const
                    ).map(([key, label, on]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setFeature({ [key]: !on } as Partial<RunFeatures>)}
                        className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                          on
                            ? 'border-accent-soft/50 bg-accent-soft/10 text-accent-soft'
                            : 'border-hairline text-mutedtext hover:text-ink'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-1 pt-1">
                    <button
                      type="button"
                      onClick={() => void window.power.pickRepo().then((r) => r && setRepo(r))}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-mutedtext transition-colors hover:bg-raised hover:text-ink"
                    >
                      <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.6} />
                      {repo ? repo.split('/').slice(-1)[0] : 'Choose repository'}
                    </button>
                    <button
                      type="button"
                      data-testid="start-run"
                      onClick={() => void start()}
                      disabled={goal.trim().length < 8}
                      aria-label="Start run"
                      className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <p
                  data-arrive
                  className="max-w-md text-center text-[13px] leading-relaxed text-mutedtext"
                >
                  Eight specialists, gates that run as code, one approval. Runs use your
                  own Claude Code login — there is no API key.
                  <span className="mt-2 block text-[11px] text-mutedtext/70">
                    ⌘⇧Space summons Power from anywhere · Esc puts it away
                  </span>
                </p>
              </div>
            )}

            {view === 'run' && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex max-w-2xl flex-col gap-3 px-6 py-6">
                  {/* Your goal, as the opening message. */}
                  <div className="self-end rounded-2xl rounded-br-md bg-raised px-4 py-2.5 text-[14px] text-ink">
                    {goal}
                  </div>

                  {STAGES.filter(({ id }) => stages[id]).map(({ id }) => {
                    const lines = log
                      .filter((l) => ROLE_STAGE[l.role] === id)
                      .map((l) => l.line);
                    const gateHit = gates.find((g) => GATE_STAGE[g.stage] === id);
                    const retryCount = retries
                      .filter((r) => EDGE_STAGE[r.edge] === id)
                      .reduce((m, r) => Math.max(m, r.used), 0);

                    if (id === 'approval') {
                      return (
                        <StageCard
                          key={id}
                          stage={id}
                          status={stages[id] ?? 'pending'}
                          lines={[]}
                        >
                          {spec !== null && (
                            <div className="mt-2">
                              <pre className="selectable max-h-72 overflow-y-auto rounded-xl border border-hairline bg-canvas px-4 py-3 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-bodytext">
                                {spec}
                              </pre>
                              <div className="mt-2.5 flex items-center gap-2">
                                <button
                                  type="button"
                                  data-testid="approve-spec"
                                  onClick={() => {
                                    setSpec(null);
                                    setStages((st) => ({ ...st, approval: 'pass' }));
                                    void window.power.approve();
                                  }}
                                  className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSpec(null);
                                    void window.power.reject(
                                      rejectReason || 'rejected from the app',
                                    );
                                    setRejectReason('');
                                  }}
                                  className="rounded-md border border-hairline bg-panel px-3 py-1.5 text-sm font-medium text-bodytext hover:bg-raised hover:text-ink"
                                >
                                  Reject
                                </button>
                                <input
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Reason, if rejecting"
                                  className="min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-mutedtext focus:border-mutedtext focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                          {spec === null && (stages[id] ?? '') === 'running' && (
                            <p className="mt-1.5 pl-6 text-[12.5px] text-mutedtext">
                              Reading the spec…
                            </p>
                          )}
                        </StageCard>
                      );
                    }

                    const roleForStage = Object.entries(ROLE_STAGE).find(
                      ([, st]) => st === id,
                    )?.[0];
                    return (
                      <StageCard
                        key={id}
                        stage={id}
                        status={stages[id] ?? 'pending'}
                        lines={lines}
                        gate={gateHit}
                        retriesUsed={retryCount}
                        usage={roleForStage ? usage[roleForStage] : undefined}
                      />
                    );
                  })}

                  {blocked && (
                    <div
                      data-testid="blocked-banner"
                      className="rounded-2xl border border-accent-soft/40 bg-accent-soft/10 px-4 py-3"
                    >
                      <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <CircleAlert className="h-4 w-4 text-accent-soft" strokeWidth={2} />
                        Run blocked
                      </p>
                      <p className="selectable mt-1 text-[13px] whitespace-pre-wrap text-bodytext">
                        {blocked}
                      </p>
                    </div>
                  )}
                  {error && (
                    <div className="rounded-2xl border border-accent-soft/40 bg-accent-soft/10 px-4 py-3 text-sm text-ink">
                      <span className="font-semibold">Error: </span>
                      {error}
                    </div>
                  )}
                  {done && (
                    <div
                      data-testid="done-banner"
                      className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-ink">
                        Run complete — all gates passed.
                        {totalCost > 0 && (
                          <span className="ml-2 font-mono text-[12px] font-normal text-bodytext">
                            ${totalCost.toFixed(2)} total
                          </span>
                        )}
                      </p>
                      <pre className="selectable mt-1 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-bodytext">
                        {done.trim()}
                      </pre>
                    </div>
                  )}
                  <div ref={logEnd} />
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
