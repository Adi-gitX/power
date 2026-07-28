/**
 * Electron main process: a thin native shell around the engine.
 *
 * All product logic lives in `engine/` (tested headlessly); this file only
 * owns the window, the IPC bridge, and the three native notifications that
 * justify a desktop app at all — approval needed, run blocked, run done.
 * Those fire when the app is in the background, which is precisely when a
 * long unattended run needs to reach you.
 */
import { app, BrowserWindow, dialog, ipcMain, Notification } from 'electron';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { PowerRun, readArtifact } from './engine/runner.js';
import type { RunEvent } from './engine/types.js';

/** The plugin root: scripts/, agents/, packages/. Overridable for packaging. */
const POWER_ROOT =
  process.env.POWER_ROOT ?? resolve(app.getAppPath(), '..', '..');

let win: BrowserWindow | null = null;
let activeRun: PowerRun | null = null;

function notify(title: string, body: string): void {
  if (Notification.isSupported()) new Notification({ title, body }).show();
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    title: 'Power',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#faf9f5',
    webPreferences: {
      preload: join(app.getAppPath(), 'out', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(app.getAppPath(), 'out', 'renderer', 'index.html'));
  }
}

app.whenReady().then(() => {
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

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
