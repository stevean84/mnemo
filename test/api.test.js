import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openStore } from '../src/db.js';
import { createApp } from '../src/server.js';

let server, base;
before(async () => {
  server = createApp(openStore(':memory:'));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (body) => fetch(`${base}/api/memories`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('기억 추가·조회', async () => {
  const res = await post({ content: '주력 언어는 TypeScript', kind: 'skill', tags: 'ts, backend', source: 'cli' });
  assert.equal(res.status, 201);
  const m = await res.json();
  assert.equal(m.kind, 'skill');
  assert.equal(m.tags, 'ts,backend');
  const list = await (await fetch(`${base}/api/memories`)).json();
  assert.equal(list[0].content, '주력 언어는 TypeScript');
});

test('빈 내용·잘못된 kind는 400', async () => {
  assert.equal((await post({ content: '   ' })).status, 400);
  assert.equal((await post({ content: 'x', kind: 'wrong' })).status, 400);
});

test('검색은 한국어 2글자 부분 일치와 kind 필터를 지원', async () => {
  await post({ content: '동생이 한 명 있다', kind: 'family', visibility: 'private' });
  await post({ content: '동아리 ATTENTION 활동 중', kind: 'together' });
  const hit = await (await fetch(`${base}/api/memories?q=${encodeURIComponent('동생')}`)).json();
  assert.deepEqual(hit.map((m) => m.kind), ['family']);
  const byKind = await (await fetch(`${base}/api/memories?kind=together`)).json();
  assert.equal(byKind.length, 1);
});

test('context는 기본적으로 비공개 기억을 제외', async () => {
  const md = await (await fetch(`${base}/api/context`)).text();
  assert.match(md, /## 기술/);
  assert.doesNotMatch(md, /동생/);
  const withPrivate = await (await fetch(`${base}/api/context?private=1`)).text();
  assert.match(withPrivate, /동생/);
});

test('수정·삭제', async () => {
  const m = await (await post({ content: '임시', kind: 'note' })).json();
  const upd = await fetch(`${base}/api/memories/${m.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: '수정됨' }) });
  assert.equal((await upd.json()).content, '수정됨');
  assert.equal((await fetch(`${base}/api/memories/${m.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${base}/api/memories/${m.id}`)).status, 404);
});
