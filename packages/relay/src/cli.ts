/**
 * Relay's entry point, spawned by Power exactly like the other bundled CLIs:
 *
 *   node packages/relay/dist/cli.js --port 20199 --config <path>
 *
 * It starts the server and stays up. Power manages its lifecycle (start, health,
 * stop, supervise) — this process just listens.
 */
import { startServer } from './server.js';

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const port = Number(flag('--port') ?? '20199');
if (!Number.isFinite(port) || port <= 0) {
  process.stderr.write('relay: invalid --port\n');
  process.exit(2);
}

startServer({ port, ...(flag('--config') ? { configPath: flag('--config')! } : {}) });
process.stderr.write(`relay: listening on 127.0.0.1:${port}\n`);
