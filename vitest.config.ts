import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Pin the root: without it Vite resolves upward and picks up unrelated
  // config from the user's home directory.
  root: fileURLToPath(new URL('.', import.meta.url)),
  css: { postcss: {} },
  test: {
    include: ['{packages,apps}/*/test/**/*.test.ts'],
  },
});
