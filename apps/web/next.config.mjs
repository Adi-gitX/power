import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The monorepo root, not this app.
 *
 * pnpm links every dependency to a realpath under the workspace-level
 * `node_modules/.pnpm/` store. Turbopack refuses to compile anything outside its
 * root, so pinning the root to `apps/web` puts every dependency out of bounds —
 * including Next itself, which is what the "couldn't find next/package.json"
 * error is really reporting.
 */
const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Static export. Every route is rendered to HTML at build time, which is the
 * strongest position for indexing: crawlers get the full text without executing
 * a line of JavaScript.
 *
 * `images.unoptimized` is required rather than optional — the default image
 * optimizer is a server feature, and `next/image` throws at build time under
 * `output: 'export'` without it.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: 'export',
  // Must be the workspace root — see the note on `workspaceRoot` above.
  turbopack: { root: workspaceRoot },
  images: { unoptimized: true },
  // Emits `about/index.html` rather than `about.html`, which is what static
  // hosts serve correctly without rewrite rules.
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
