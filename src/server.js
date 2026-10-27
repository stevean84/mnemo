import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, toContext, KINDS, ValidationError } from './db.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

export function createApp(store) {
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (url.pathname.startsWith('/api/')) return await api(store, req, res, url);
      return await serveStatic(res, url.pathname);
    } catch (err) {
      if (err instanceof ValidationError) return send(res, 400, { error: err.message });
      if (err instanceof SyntaxError) return send(res, 400, { error: 'JSON 형식이 올바르지 않습니다.' });
      console.error(err);
      return send(res, 500, { error: '서버 오류가 발생했습니다.' });
    }
  });
}

async function api(store, req, res, url) {
  const path = url.pathname;
  const idMatch = path.match(/^\/api\/memories\/(\d+)$/);

  if (path === '/api/health' && req.method === 'GET') {
    return send(res, 200, { ok: true, count: store.count(), kinds: KINDS });
  }
  if (path === '/api/memories' && req.method === 'GET') {
    return send(res, 200, store.list({
      q: url.searchParams.get('q') ?? '',
      kind: url.searchParams.get('kind') ?? '',
      includePrivate: url.searchParams.get('private') !== '0',
      limit: url.searchParams.get('limit') ?? 200,
    }));
  }
  if (path === '/api/memories' && req.method === 'POST') {
    return send(res, 201, store.add(await readJson(req)));
  }
  if (idMatch && req.method === 'GET') {
    const m = store.get(idMatch[1]);
    return m ? send(res, 200, m) : send(res, 404, { error: '기억을 찾을 수 없습니다.' });
  }
  if (idMatch && req.method === 'PATCH') {
    const m = store.update(idMatch[1], await readJson(req));
    return m ? send(res, 200, m) : send(res, 404, { error: '기억을 찾을 수 없습니다.' });
  }
  if (idMatch && req.method === 'DELETE') {
    return store.remove(idMatch[1]) ? send(res, 204) : send(res, 404, { error: '기억을 찾을 수 없습니다.' });
  }
  if (path === '/api/context' && req.method === 'GET') {
    const memories = store.list({
      q: url.searchParams.get('q') ?? '',
      includePrivate: url.searchParams.get('private') === '1',
      limit: 1000,
    }).reverse();
    res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
    return res.end(toContext(memories));
  }
  return send(res, 404, { error: '없는 API입니다.' });
}

async function serveStatic(res, pathname) {
  const file = normalize(join(PUBLIC, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    send(res, 404, { error: 'not found' });
  }
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new ValidationError('요청이 너무 큽니다.');
  }
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, body) {
  if (body === undefined) { res.writeHead(status); return res.end(); }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4747);
  const store = openStore(process.env.MNEMO_DB ?? join(ROOT, 'data', 'mnemo.db'));
  createApp(store).listen(port, '127.0.0.1', () => {
    console.log(`Mnemo 실행 중 → http://localhost:${port}`);
  });
}
