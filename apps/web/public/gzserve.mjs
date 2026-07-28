import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const ROOT = '/Users/kammatiaditya/Library/power/apps/web/out';
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2', '.xml':'application/xml', '.txt':'text/plain' };
const COMPRESS = new Set(['.html','.js','.css','.json','.svg','.xml','.txt']);

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = join(ROOT, p);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch {}
  try {
    let body = await readFile(file);
    const ext = extname(file);
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    if (COMPRESS.has(ext)) {
      const enc = req.headers['accept-encoding'] || '';
      if (enc.includes('br')) { body = brotliCompressSync(body); res.setHeader('Content-Encoding','br'); }
      else if (enc.includes('gzip')) { body = gzipSync(body); res.setHeader('Content-Encoding','gzip'); }
    }
    res.end(body);
  } catch { res.statusCode = 404; res.end('not found'); }
}).listen(4322, () => console.log('  compressing server on :4322'));
