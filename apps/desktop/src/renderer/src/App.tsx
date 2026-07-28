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
}

declare global {
  interface Window {
    power: {
      pickRepo(): Promise<string | null>;
      history(): Promise<HistoryRow[]>;
      startRun(repo: string, goal: string): Promise<{ ok: boolean; error?: string }>;
      approve(): Promise<void>;
      reject(reason: string): Promise<void>;
      stop(): Promise<void>;
      hide(): Promise<void>;
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

export default function App() {
  const [phase, setPhase] = useState<'intro' | 'app'>('intro');
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
  const logEnd = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const ask = useRef<HTMLTextAreaElement>(null);
  const repoRef = useRef<string | null>(null);
  repoRef.current = repo;

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
    const result = await window.power.startRun(dir, goal.trim());
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
                  className="block w-full truncate rounded-lg px-2.5 py-2 text-left text-[13px] text-bodytext transition-colors hover:bg-raised hover:text-ink"
                >
                  {h.goal}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 border-t border-hairline px-4 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-hairline bg-raised font-mono text-[11px] text-ink">
                /
              </span>
              <span className="truncate text-[13px] text-bodytext">
                {repo ? repo.split('/').slice(-1)[0] : 'No repository'}
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
                      blocked
                        ? 'bg-accent-soft'
                        : done
                          ? 'bg-emerald-400'
                          : 'animate-pulse bg-accent-soft'
                    }`}
                  />
                  <span className="truncate text-[13px] font-medium text-ink">{goal}</span>
                  {repo && (
                    <span className="hidden shrink-0 rounded-md border border-hairline bg-canvas/60 px-2 py-0.5 font-mono text-[11px] text-mutedtext md:block">
                      {repo.split('/').slice(-1)[0]}
                    </span>
                  )}
                  <span className="shrink-0 text-[12px] text-mutedtext">
                    {blocked ? 'blocked' : done ? 'complete' : 'running'}
                  </span>
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

            {view === 'home' && (
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
              <div className="flex min-h-0 flex-1">
                {/* Pipeline rail */}
                <div className="w-52 shrink-0 overflow-y-auto border-r border-hairline px-3 py-2">
                  <p className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-mutedtext">
                    PIPELINE
                  </p>
                  <ol className="space-y-0.5">
                    {STAGES.map(({ id, label }) => {
                      const status = stages[id] ?? 'pending';
                      return (
                        <li
                          key={id}
                          data-stage={id}
                          data-status={status}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[13px] ${
                            status === 'running'
                              ? 'bg-raised text-ink'
                              : status === 'pass'
                                ? 'text-bodytext'
                                : status === 'fail'
                                  ? 'text-accent-soft'
                                  : 'text-mutedtext'
                          }`}
                        >
                          {status === 'running' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                          ) : status === 'pass' ? (
                            <Check className="h-3.5 w-3.5 text-accent-soft" strokeWidth={2.5} />
                          ) : status === 'fail' ? (
                            <OctagonX className="h-3.5 w-3.5" strokeWidth={2} />
                          ) : (
                            <span className="inline-block h-1.5 w-1.5 rounded-full border border-mutedtext/60" />
                          )}
                          {label}
                        </li>
                      );
                    })}
                  </ol>

                  {gates.length > 0 && (
                    <>
                      <p className="px-2 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-mutedtext">
                        GATES
                      </p>
                      <div className="space-y-1 px-2">
                        {gates.map((g, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between font-mono text-[12px]"
                          >
                            <span className="text-bodytext">{g.stage}</span>
                            <span className={g.pass ? 'text-emerald-400' : 'text-accent-soft'}>
                              {g.pass ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {Object.keys(retriesUsed).length > 0 && (
                    <>
                      <p className="px-2 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-mutedtext">
                        RETRIES
                      </p>
                      <div className="space-y-1 px-2">
                        {Object.entries(retriesUsed).map(([edge, used]) => (
                          <div key={edge} className="flex items-center gap-1.5 font-mono text-[12px]">
                            <RefreshCw className="h-3 w-3 text-mutedtext" strokeWidth={1.5} />
                            <span className="text-bodytext">{edge}</span>
                            <span className="ml-auto text-mutedtext">{used}/2</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Log + banners */}
                <div className="relative flex min-w-0 flex-1 flex-col">
                  {blocked && (
                    <div
                      data-testid="blocked-banner"
                      className="flex items-start gap-2 border-b border-accent/40 bg-accent/15 px-4 py-3"
                    >
                      <CircleAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft"
                        strokeWidth={2}
                      />
                      <div className="selectable min-w-0 text-sm">
                        <span className="font-semibold text-ink">Run blocked. </span>
                        <span className="whitespace-pre-wrap text-bodytext">{blocked}</span>
                      </div>
                    </div>
                  )}
                  {error && (
                    <div className="border-b border-accent/40 bg-accent/15 px-4 py-3 text-sm text-ink">
                      <span className="font-semibold">Error: </span>
                      {error}
                    </div>
                  )}
                  {done && (
                    <div
                      data-testid="done-banner"
                      className="border-b border-emerald-500/25 bg-emerald-500/10 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-ink">
                        Run complete — all gates passed.
                      </p>
                      <pre className="selectable mt-1 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-bodytext">
                        {done.trim()}
                      </pre>
                    </div>
                  )}

                  <div className="selectable min-h-0 flex-1 overflow-y-auto bg-code/80 px-4 py-3 font-mono text-[12.5px] leading-relaxed">
                    {log.length === 0 && !done && !blocked && (
                      <p className="text-mutedtext">{running ? 'Dispatching…' : ''}</p>
                    )}
                    {log.map((entry, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-24 shrink-0 text-mutedtext">{entry.role}</span>
                        <span className="min-w-0 break-words whitespace-pre-wrap text-bodytext">
                          {entry.line}
                        </span>
                      </div>
                    ))}
                    <div ref={logEnd} />
                  </div>

                  {/* The one human gate */}
                  {spec !== null && (
                    <div className="absolute inset-0 flex flex-col bg-shell/85 backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                        <div>
                          <p className="display text-lg text-ink">Approve the spec</p>
                          <p className="text-xs text-mutedtext">
                            The only decision this run asks of you.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason, if rejecting"
                            className="w-56 rounded-md border border-hairline bg-canvas px-3 py-1.5 text-sm text-ink placeholder:text-mutedtext focus:border-mutedtext focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSpec(null);
                              void window.power.reject(rejectReason || 'rejected from the app');
                              setRejectReason('');
                            }}
                            className="rounded-md border border-hairline bg-panel px-3 py-1.5 text-sm font-medium text-bodytext hover:bg-raised hover:text-ink"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            data-testid="approve-spec"
                            onClick={() => {
                              setSpec(null);
                              setStages((s) => ({ ...s, approval: 'pass' }));
                              void window.power.approve();
                            }}
                            className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                      <pre className="selectable min-h-0 flex-1 overflow-y-auto bg-canvas px-6 py-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-bodytext">
                        {spec}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
