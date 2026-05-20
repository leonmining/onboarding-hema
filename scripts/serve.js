#!/usr/bin/env node
// Minimale dev-server zonder dependencies. Serveert statisch vanuit de root,
// inclusief /pad/ → /pad/index.html en /out/?p=… als redirect-pagina.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const port = process.env.PORT || 4321;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml'
};

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    let file = join(root, urlPath);
    if (!existsSync(file) || statSync(file).isDirectory()) {
      const idx = join(root, urlPath, 'index.html');
      if (existsSync(idx)) file = idx;
      else { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('404'); }
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(`Error: ${err.message}`);
  }
}).listen(port, () => console.log(`▶ http://localhost:${port}`));
