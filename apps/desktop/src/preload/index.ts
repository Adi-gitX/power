import { contextBridge, ipcRenderer } from 'electron';

/**
 * The entire surface the renderer may touch. Context isolation on, node off —
 * the dashboard is a viewer and a pair of buttons, and it gets exactly that.
 */
const api = {
  pickRepo: (): Promise<string | null> => ipcRenderer.invoke('power:pick-repo'),
  history: (): Promise<{ goal: string; repoDir: string; at: string }[]> =>
    ipcRenderer.invoke('power:history'),
  startRun: (repoDir: string, goal: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('power:start-run', repoDir, goal),
  approve: (): Promise<void> => ipcRenderer.invoke('power:approve'),
  reject: (reason: string): Promise<void> => ipcRenderer.invoke('power:reject', reason),
  stop: (): Promise<void> => ipcRenderer.invoke('power:stop'),
  hide: (): Promise<void> => ipcRenderer.invoke('power:hide-window'),
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
