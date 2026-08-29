/**
 * Electron main process: a thin native shell around the engine.
 *
 * All product logic lives in `engine/` (tested headlessly); this file only
 * owns the window, the IPC bridge, and the three native notifications that
 * justify a desktop app at all — approval needed, run blocked, run done.
 * Those fire when the app is in the background, which is precisely when a
 * long unattended run needs to reach you.
 */
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  Tray,
} from 'electron';

// The intro chime is synthesized in the renderer on launch; without this,
// Chromium's autoplay policy silences audio that no click preceded.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { PowerRun, readArtifact } from './engine/runner.js';
import { DEFAULT_FEATURES, type RunEvent, type RunFeatures } from './engine/types.js';

// Two instances would run two engines against one quota. The second launch
// just summons the first.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}
app.on('second-instance', () => showWindow());

// A Finder-launched app inherits PATH=/usr/bin:/bin — the `claude` CLI lives
// in homebrew's prefix, so extend PATH before anything spawns.
process.env.PATH = [
  process.env.PATH ?? '',
  '/opt/homebrew/bin',
  '/usr/local/bin',
  join(app.getPath('home'), '.local', 'bin'),
].join(':');

/**
 * The Power repo root: scripts/, agents/, packages/. In dev the app lives at
 * <root>/apps/desktop so two levels up is right; packaged, getAppPath() is
 * inside the .app bundle, so fall back to a config file and then the standard
 * location. First candidate that actually contains the state script wins.
 */
function resolvePowerRoot(): string {
  const candidates = [
    process.env.POWER_ROOT,
    (() => {
      try {
        const cfg = JSON.parse(
          readFileSync(join(app.getPath('home'), '.power-desktop.json'), 'utf8'),
        ) as { powerRoot?: string };
        return cfg.powerRoot;
      } catch {
        return undefined;
      }
    })(),
    resolve(app.getAppPath(), '..', '..'),
    join(app.getPath('home'), 'Library', 'power'),
  ];
  for (const c of candidates) {
    if (c && existsSync(join(c, 'scripts', 'run-state.mjs'))) return c;
  }
  return candidates[candidates.length - 1]!;
}
const POWER_ROOT = resolvePowerRoot();

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let activeRun: PowerRun | null = null;

/**
 * Raycast-style lifecycle: closing the window never quits. The app lives in the
 * menu bar and the Dock, the window hides instead of closing, and a global
 * shortcut summons it from anywhere — which is what lets a long unattended run
 * keep going with no window on screen at all. Quitting is an explicit act, from
 * the tray menu or Cmd+Q.
 */
let quitting = false;

function showWindow(): void {
  if (!win) {
    createWindow();
    return;
  }
  win.show();
  win.focus();
}

function toggleWindow(): void {
  if (win?.isVisible() && win.isFocused()) win.hide();
  else showWindow();
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show();
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Power',
    // The Perplexity-style shell: no frame chrome, a fully transparent window,
    // and macOS vibrancy behind it. The DOM draws its own rounded dark surface,
    // which is what lets the intro float the mark alone over the desktop before
    // the surface fades in.
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(app.getAppPath(), 'out', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Hide, never close — the run (and the app) outlives its window.
  win.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      win?.hide();
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(app.getAppPath(), 'out', 'renderer', 'index.html'));
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(
    join(app.getAppPath(), 'resources', 'trayTemplate.png'),
  );
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('Power');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Power', click: showWindow },
      { type: 'separator' },
      {
        label: 'Summon: ⌘⇧Space',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Quit Power',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('click', toggleWindow);
}

/** Recent runs, for the sidebar. One JSON file in userData; newest first. */
function historyPath(): string {
  return join(app.getPath('userData'), 'runs.json');
}
function readHistory(): unknown[] {
  try {
    return JSON.parse(readFileSync(historyPath(), 'utf8'));
  } catch {
    return [];
  }
}
function recordRun(entry: Record<string, unknown>): void {
  const rows = [entry, ...readHistory()].slice(0, 50);
  writeFileSync(historyPath(), JSON.stringify(rows, null, 2));
}
/** Stamp the newest row when its run finishes, so Recent shows what it cost. */
function updateLatestRun(patch: Record<string, unknown>): void {
  const rows = readHistory() as Record<string, unknown>[];
  if (rows[0]) rows[0] = { ...rows[0], ...patch };
  writeFileSync(historyPath(), JSON.stringify(rows, null, 2));
}

/** Configured providers (gateways). One JSON file in userData; the Claude
 * default is implicit and never stored. Mirrors Swift's ProviderStore. */
function providersPath(): string {
  return join(app.getPath('userData'), 'providers.json');
}
function readProviders(): unknown[] {
  try {
    return JSON.parse(readFileSync(providersPath(), 'utf8'));
  } catch {
    return [];
  }
}

app.whenReady().then(() => {
  ipcMain.handle('power:history', () => readHistory());

  ipcMain.handle('power:providers', () => readProviders());
  ipcMain.handle('power:save-providers', (_e, providers: unknown[]) => {
    writeFileSync(providersPath(), JSON.stringify(providers ?? [], null, 2));
    return true;
  });
  ipcMain.handle('power:detect-gateway', async (_e, baseUrl?: string) => {
    const { detectGateway } = await import('./engine/providers.js');
    return detectGateway(baseUrl);
  });

  ipcMain.handle('power:pick-repo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      message: 'Choose the repository Power will work in',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(
    'power:start-run',
    (_event, repoDir: string, goal: string, features?: RunFeatures) => {
    if (activeRun) return { ok: false, error: 'a run is already active' };
    if (!existsSync(join(POWER_ROOT, 'scripts', 'run-state.mjs'))) {
      return { ok: false, error: `Power root not found at ${POWER_ROOT}` };
    }

    activeRun = new PowerRun({
      repoDir,
      goal,
      features: features ?? DEFAULT_FEATURES,
      providers: readProviders() as never,
      powerRoot: POWER_ROOT,
      // The test harness swaps the model for fixture-writing mocks; production
      // dispatches through the user's own `claude` CLI login.
      ...(process.env.POWER_MOCK_AGENTS
        ? {
            agentCommand: (role: string) => ({
              cmd: 'node',
              args: [
                join(POWER_ROOT, 'apps', 'desktop', 'test', 'mock-agent.mjs'),
                role,
                repoDir,
                join(POWER_ROOT, 'packages', 'gates', 'test', 'fixtures'),
              ],
            }),
          }
        : {}),
    });

    let lastCost = 0;
    activeRun.on('event', (e: RunEvent) => {
      win?.webContents.send('power:event', e);
      if (e.type === 'run_usage') lastCost = e.costUsd;
      if (e.type === 'needs_approval') notify('Power', 'A spec is waiting for your approval.');
      if (e.type === 'blocked') {
        updateLatestRun({ outcome: 'blocked', costUsd: lastCost });
        notify('Power — run blocked', e.reason.split('\n')[0] ?? '');
      }
      if (e.type === 'done') {
        updateLatestRun({ outcome: 'done', costUsd: lastCost });
        notify('Power — run complete', 'All gates passed.');
      }
    });

    recordRun({ goal, repoDir, features: features ?? DEFAULT_FEATURES, at: new Date().toISOString() });
    void activeRun.run().finally(() => {
      activeRun = null;
    });
    return { ok: true };
    },
  );

  ipcMain.handle('power:approve', () => activeRun?.approve());
  ipcMain.handle('power:reject', (_event, reason: string) => activeRun?.reject(reason));
  ipcMain.handle('power:stop', () => activeRun?.stop());
  ipcMain.handle('power:read-artifact', (_event, repoDir: string, name: string) =>
    readArtifact(repoDir, name),
  );

  ipcMain.handle('power:hide-window', () => win?.hide());

  /**
   * The Claude connection, VSCode-extension style: the app neither stores nor
   * sees a credential. `claude auth status` reports the CLI's own login (the
   * user's claude.ai account), and sign-in just runs the CLI's OAuth flow —
   * the browser opens, the user approves, the CLI keeps the token in its own
   * keychain. The app is a client of that session, never a custodian.
   */
  ipcMain.handle('power:auth-status', async () => {
    return await new Promise((resolveStatus) => {
      const child = spawn('claude', ['auth', 'status'], { env: process.env });
      let out = '';
      child.stdout.on('data', (c: Buffer) => (out += c.toString()));
      child.on('error', () => resolveStatus({ cliFound: false, loggedIn: false }));
      child.on('close', () => {
        try {
          const parsed = JSON.parse(out) as { loggedIn?: boolean; email?: string };
          resolveStatus({ cliFound: true, loggedIn: !!parsed.loggedIn, email: parsed.email });
        } catch {
          resolveStatus({ cliFound: true, loggedIn: false });
        }
      });
    });
  });

  ipcMain.handle('power:auth-login', async () => {
    return await new Promise((resolveLogin) => {
      const child = spawn('claude', ['auth', 'login'], { env: process.env });
      child.on('error', () => resolveLogin(false));
      child.on('close', (code) => resolveLogin(code === 0));
    });
  });

  createWindow();
  createTray();
  globalShortcut.register('CommandOrControl+Shift+Space', toggleWindow);

  app.on('activate', () => showWindow());
});

app.on('before-quit', () => {
  quitting = true;
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
app.on('window-all-closed', () => {
  // Stay resident: the tray and the shortcut keep the app reachable.
});
