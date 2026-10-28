// Lokal testserver uten Netlify: node dev-server.mjs  →  http://localhost:8888
// Bruker minnelagring og PIN 1234. Ikke for bruk på selve kvelden.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

process.env.TP_MEMORY_STORE = '1';
process.env.ADMIN_PIN ??= '1234';
const { handle } = await import('./netlify/lib/game.mjs');

const root = new URL('./public/', import.meta.url).pathname;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };
const alias = { '/': '/index.html', '/skjerm': '/skjerm.html', '/kontroll': '/kontroll.html' };
const port = Number(process.env.PORT ?? 8888);

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const r = await handle(request);
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  const path = normalize(alias[url.pathname] ?? url.pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const data = await readFile(join(root, path));
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Ikke funnet');
  }
}).listen(port, () => console.log(`Trainee Pursuit kjører på http://localhost:${port}`));
