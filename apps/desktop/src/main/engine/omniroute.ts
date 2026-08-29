/**
 * Managed OmniRoute lifecycle — Power installs, starts, health-checks, and stops
 * a local OmniRoute gateway so the whole thing lives inside the app. OmniRoute
 * is an MIT-licensed local server the user runs on their own machine with their
 * own provider accounts; Power orchestrates it, it never ships anyone's
 * credentials.
 *
 * Nothing here is on a hot path or CPU-bound, so it stays plain child_process +
 * fetch. The one invariant: a routed run must not dispatch until the server
 * answers its health ping, or the first stage fails against a dead endpoint.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { OMNIROUTE_DEFAULT_BASE, normalizeBaseUrl } from './providers.js';

const HEALTH_PATH = '/api/health/ping';

export type OmniRouteState = 'not-installed' | 'stopped' | 'starting' | 'running';

/** True if the `omniroute` CLI is on PATH. */
export async function isInstalled(pathEnv?: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('which', ['omniroute'], {
      env: pathEnv ? { ...process.env, PATH: pathEnv } : process.env,
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

/** Does the server answer its health ping? A short timeout keeps preflight snappy. */
export async function ping(base = OMNIROUTE_DEFAULT_BASE, timeoutMs = 1000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(normalizeBaseUrl(base) + HEALTH_PATH, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Install the CLI globally. Resolves with the combined output; rejects non-zero. */
export function install(onLine?: (line: string) => void, pathEnv?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install', '-g', 'omniroute'], {
      env: pathEnv ? { ...process.env, PATH: pathEnv } : process.env,
    });
    const feed = (b: Buffer) => {
      if (onLine) for (const l of b.toString().split('\n')) if (l.trim()) onLine(l);
    };
    child.stdout?.on('data', feed);
    child.stderr?.on('data', feed);
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`npm exited ${code}`))));
  });
}

/**
 * A supervised OmniRoute server. Start is idempotent — if the port already
 * answers, it adopts the running instance rather than spawning a duplicate.
 */
export class OmniRouteServer {
  private child: ChildProcess | null = null;

  constructor(private readonly pathEnv?: string) {}

  async ensureRunning(base = OMNIROUTE_DEFAULT_BASE, waitMs = 30_000): Promise<boolean> {
    if (await ping(base)) return true;
    this.child = spawn('omniroute', [], {
      detached: false,
      env: this.pathEnv ? { ...process.env, PATH: this.pathEnv } : process.env,
      stdio: 'ignore',
    });
    this.child.on('error', () => {
      this.child = null;
    });
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      if (await ping(base)) return true;
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  stop(): void {
    this.child?.kill('SIGTERM');
    this.child = null;
  }
}
