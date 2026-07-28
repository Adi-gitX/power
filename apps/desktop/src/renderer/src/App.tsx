import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CircleAlert,
  FolderOpen,
  Loader2,
  OctagonX,
  Play,
  RefreshCw,
} from 'lucide-react';

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

declare global {
  interface Window {
    power: {
      pickRepo(): Promise<string | null>;
      startRun(repo: string, goal: string): Promise<{ ok: boolean; error?: string }>;
      approve(): Promise<void>;
      reject(reason: string): Promise<void>;
      stop(): Promise<void>;
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
  const [repo, setRepo] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [running, setRunning] = useState(false);
  const [stages, setStages] = useState<Record<string, StageStatus>>({});
  const [gates, setGates] = useState<{ stage: string; pass: boolean }[]>([]);
  const [retries, setRetries] = useState<{ edge: string; used: number; cap: number }[]>([]);
  const [log, setLog] = useState<{ role: string; line: string }[]>([]);
  const [spec, setSpec] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const logEnd = useRef<HTMLDivElement>(null);
  const repoRef = useRef<string | null>(null);
  repoRef.current = repo;

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
          // stream-json frames are transport, not narrative; keep readable text.
          if (!line.startsWith('{')) {
            setLog((l) => [...l.slice(-499), { role: String(e.role), line }]);
          }
          break;
        }
        case 'gate':
          setGates((g) => [...g, { stage: String(e.stage), pass: Boolean(e.pass) }]);
          break;
        case 'retry':
          setRetries((r) => [
            ...r,
            { edge: String(e.edge), used: Number(e.used), cap: Number(e.cap) },
          ]);
          break;
        case 'needs_approval': {
          const currentRepo = repoRef.current;
          if (currentRepo) {
            void window.power.readArtifact(currentRepo, 'SPEC.md').then((text) => {
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
    if (!repo || goal.trim().length < 8) return;
    setStages({});
    setGates([]);
    setRetries([]);
    setLog([]);
    setSpec(null);
    setBlocked(null);
    setDone(null);
    setError(null);
    const result = await window.power.startRun(repo, goal.trim());
    if (!result.ok) setError(result.error ?? 'could not start');
    else setRunning(true);
  };

  const approve = () => {
    setSpec(null);
    setStages((s) => ({ ...s, approval: 'pass' }));
    void window.power.approve();
  };
  const reject = () => {
    setSpec(null);
    void window.power.reject(rejectReason || 'rejected from the app');
    setRejectReason('');
  };

  const retriesUsed = useMemo(
    () =>
      retries.reduce<Record<string, number>>((acc, r) => {
        acc[r.edge] = Math.max(acc[r.edge] ?? 0, r.used);
        return acc;
      }, {}),
    [retries],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Title bar */}
      <header className="titlebar-drag flex h-12 shrink-0 items-center justify-between border-b border-hairline bg-canvas pr-4 pl-20">
        <span className="font-mono text-sm font-semibold text-ink">
          power<span className="text-accent">/</span>
        </span>
        <span className="text-xs text-mutedtext">
          {repo ? repo.split('/').slice(-2).join('/') : 'no repository selected'}
        </span>
      </header>

      {/* Command row */}
      <div className="flex shrink-0 items-center gap-2 border-b border-hairline bg-canvas px-4 py-3">
        <button
          type="button"
          onClick={() => void window.power.pickRepo().then((r) => r && setRepo(r))}
          disabled={running}
          className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 py-2 text-sm font-medium text-bodytext transition-colors hover:border-mutedtext/50 hover:text-ink disabled:opacity-40"
        >
          <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
          {repo ? 'Change repo' : 'Choose repo'}
        </button>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void start()}
          placeholder='Describe the goal — e.g. "a CLI that converts CSV to JSON, with tests"'
          disabled={running}
          className="min-w-0 flex-1 rounded-md border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder:text-mutedtext focus:border-mutedtext focus:outline-none disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => void start()}
          disabled={running || !repo || goal.trim().length < 8}
          data-testid="start-run"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Play className="h-4 w-4" strokeWidth={2} />
          )}
          {running ? 'Running' : 'Run'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Pipeline rail */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-hairline bg-canvas p-3">
          <p className="px-2 pb-2 text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
            Pipeline
          </p>
          <ol className="space-y-1">
            {STAGES.map(({ id, label }) => {
              const status = stages[id] ?? 'pending';
              return (
                <li
                  key={id}
                  data-stage={id}
                  data-status={status}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[13px] ${
                    status === 'running'
                      ? 'bg-sunken text-ink'
                      : status === 'pass'
                        ? 'text-ink'
                        : status === 'fail'
                          ? 'text-accent'
                          : 'text-mutedtext'
                  }`}
                >
                  {status === 'running' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                  ) : status === 'pass' ? (
                    <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
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
              <p className="px-2 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
                Gates
              </p>
              <div className="space-y-1 px-2">
                {gates.map((g, i) => (
                  <div key={i} className="flex items-center justify-between font-mono text-[12px]">
                    <span className="text-bodytext">{g.stage}</span>
                    <span className={g.pass ? 'text-emerald-700' : 'text-accent'}>
                      {g.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {Object.keys(retriesUsed).length > 0 && (
            <>
              <p className="px-2 pt-4 pb-2 text-[11px] font-semibold tracking-wide text-mutedtext uppercase">
                Retry budget
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
        </aside>

        {/* Main pane */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          {blocked && (
            <div
              data-testid="blocked-banner"
              className="flex items-start gap-2 border-b border-accent/30 bg-accent/10 px-4 py-3"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} />
              <div className="selectable min-w-0 text-sm text-ink">
                <span className="font-semibold">Run blocked. </span>
                <span className="whitespace-pre-wrap text-bodytext">{blocked}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="border-b border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink">
              <span className="font-semibold">Error: </span>
              {error}
            </div>
          )}
          {done && (
            <div
              data-testid="done-banner"
              className="border-b border-emerald-600/25 bg-emerald-600/10 px-4 py-3"
            >
              <p className="text-sm font-semibold text-ink">Run complete — all gates passed.</p>
              <pre className="selectable mt-1 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-bodytext">
                {done.trim()}
              </pre>
            </div>
          )}

          {/* Agent log */}
          <div className="selectable min-h-0 flex-1 overflow-y-auto bg-code px-4 py-3 font-mono text-[12.5px] leading-relaxed">
            {log.length === 0 && !done && !blocked && (
              <p className="text-white/40">
                {running ? 'Dispatching…' : 'Pick a repository, describe the goal, and run.'}
              </p>
            )}
            {log.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-24 shrink-0 text-white/40">{entry.role}</span>
                <span className="min-w-0 break-words whitespace-pre-wrap text-white/85">
                  {entry.line}
                </span>
              </div>
            ))}
            <div ref={logEnd} />
          </div>

          {/* Approval sheet — the one human gate */}
          {spec !== null && (
            <div className="absolute inset-0 flex flex-col bg-canvas/95 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                <div>
                  <p className="font-serif text-lg text-ink">Approve the spec</p>
                  <p className="text-xs text-mutedtext">
                    The only decision this run asks of you. Everything after runs unattended.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason, if rejecting"
                    className="w-56 rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm focus:border-mutedtext focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={reject}
                    className="rounded-md border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-bodytext hover:border-mutedtext/50 hover:text-ink"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    data-testid="approve-spec"
                    onClick={approve}
                    className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90"
                  >
                    Approve
                  </button>
                </div>
              </div>
              <pre className="selectable min-h-0 flex-1 overflow-y-auto bg-surface px-6 py-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-bodytext">
                {spec}
              </pre>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
