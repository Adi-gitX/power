import { contextBridge, ipcRenderer } from 'electron';

/**
 * The entire surface the renderer may touch. Context isolation on, node off —
 * the dashboard is a viewer and a pair of buttons, and it gets exactly that.
 */
const api = {
  pickRepo: (): Promise<string | null> => ipcRenderer.invoke('power:pick-repo'),
  history: (): Promise<
    {
      goal: string;
      repoDir: string;
      at: string;
      outcome?: string;
      costUsd?: number;
      features?: Record<string, unknown>;
    }[]
  > => ipcRenderer.invoke('power:history'),
  startRun: (
    repoDir: string,
    goal: string,
    features?: Record<string, unknown>,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('power:start-run', repoDir, goal, features),
  approve: (): Promise<void> => ipcRenderer.invoke('power:approve'),
  reject: (reason: string): Promise<void> => ipcRenderer.invoke('power:reject', reason),
  stop: (): Promise<void> => ipcRenderer.invoke('power:stop'),
  hide: (): Promise<void> => ipcRenderer.invoke('power:hide-window'),
  authStatus: (): Promise<{ cliFound: boolean; loggedIn: boolean; email?: string }> =>
    ipcRenderer.invoke('power:auth-status'),
  authLogin: (): Promise<boolean> => ipcRenderer.invoke('power:auth-login'),
  readArtifact: (repoDir: string, name: string): Promise<string | null> =>
    ipcRenderer.invoke('power:read-artifact', repoDir, name),
  onEvent: (handler: (event: unknown) => void): (() => void) => {
    const listener = (_e: unknown, payload: unknown) => handler(payload);
    ipcRenderer.on('power:event', listener);
    return () => ipcRenderer.removeListener('power:event', listener);
  },
};

contextBridge.exposeInMainWorld('power', api);

export type PowerApi = typeof api;
