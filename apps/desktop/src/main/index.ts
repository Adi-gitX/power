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
import { readFileSync, writeFileSync } from 'node:fs';
import { PowerRun, readArtifact } from './engine/runner.js';
import type { RunEvent } from './engine/types.js';

/** The plugin root: scripts/, agents/, packages/. Overridable for packaging. */
const POWER_ROOT =
  process.env.POWER_ROOT ?? resolve(app.getAppPath(), '..', '..');

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

app.whenReady().then(() => {
  ipcMain.handle('power:history', () => readHistory());

  ipcMain.handle('power:pick-repo', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      message: 'Choose the repository Power will work in',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('power:start-run', (_event, repoDir: string, goal: string) => {
    if (activeRun) return { ok: false, error: 'a run is already active' };
    if (!existsSync(join(POWER_ROOT, 'scripts', 'run-state.mjs'))) {
      return { ok: false, error: `Power root not found at ${POWER_ROOT}` };
    }

    activeRun = new PowerRun({
      repoDir,
      goal,
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

    activeRun.on('event', (e: RunEvent) => {
      win?.webContents.send('power:event', e);
      if (e.type === 'needs_approval') notify('Power', 'A spec is waiting for your approval.');
      if (e.type === 'blocked') notify('Power — run blocked', e.reason.split('\n')[0] ?? '');
      if (e.type === 'done') notify('Power — run complete', 'All gates passed.');
    });

    recordRun({ goal, repoDir, at: new Date().toISOString() });
    void activeRun.run().finally(() => {
      activeRun = null;
    });
    return { ok: true };
  });

  ipcMain.handle('power:approve', () => activeRun?.approve());
  ipcMain.handle('power:reject', (_event, reason: string) => activeRun?.reject(reason));
  ipcMain.handle('power:stop', () => activeRun?.stop());
  ipcMain.handle('power:read-artifact', (_event, repoDir: string, name: string) =>
    readArtifact(repoDir, name),
  );

  ipcMain.handle('power:hide-window', () => win?.hide());

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
