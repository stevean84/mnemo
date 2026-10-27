#!/usr/bin/env node
// Mnemo CLI — 실행 중인 로컬 서버(MNEMO_URL, 기본 http://localhost:4747)의 API를 사용한다.
import { parseArgs } from 'node:util';

const BASE = process.env.MNEMO_URL ?? 'http://localhost:4747';
const USAGE = `사용법:
  mnemo add "<내용>" [--kind skill] [--tags a,b] [--private]
  mnemo search <검색어> [--kind job]
  mnemo list [--kind family]
  mnemo rm <id>
  mnemo context [검색어] [--private]   # AI에게 줄 Markdown (pbcopy로 복사 가능)

kind: personality(성격) job(직업) family(가족) skill(기술) together(함께한 일) conversation(대화 요약) note(기타)`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    kind: { type: 'string', short: 'k' },
    tags: { type: 'string', short: 't' },
    private: { type: 'boolean', short: 'p', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});
const [command, ...rest] = positionals;

async function call(path, options = {}) {
  let res;
  try {
    res = await fetch(BASE + path, { headers: { 'content-type': 'application/json' }, ...options });
  } catch {
    fail(`Mnemo 서버(${BASE})에 연결할 수 없습니다. service 폴더에서 ./start.sh 를 실행하세요.`);
  }
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') ?? '';
  const body = type.includes('json') ? await res.json() : await res.text();
  if (!res.ok) fail(body.error ?? `요청 실패 (${res.status})`);
  return body;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function print(items) {
  if (!items.length) return console.log('기억이 없습니다.');
  for (const m of items) {
    const lock = m.visibility === 'private' ? ' 🔒' : '';
    console.log(`#${m.id} [${m.kind}]${lock} ${m.content}${m.tags ? `  (${m.tags})` : ''}`);
  }
}

const query = (q) => new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();

switch (command) {
  case 'add': {
    const content = rest.join(' ');
    if (!content) fail('추가할 내용을 입력하세요.\n' + USAGE);
    const m = await call('/api/memories', {
      method: 'POST',
      body: JSON.stringify({ content, kind: values.kind, tags: values.tags, visibility: values.private ? 'private' : 'normal', source: 'cli' }),
    });
    console.log(`기억했습니다 #${m.id} [${m.kind}]`);
    break;
  }
  case 'search':
  case 'list':
    print(await call(`/api/memories?${query({ q: rest.join(' '), kind: values.kind })}`));
    break;
  case 'rm': {
    if (!rest[0]) fail('삭제할 id를 입력하세요.');
    await call(`/api/memories/${rest[0]}`, { method: 'DELETE' });
    console.log(`삭제했습니다 #${rest[0]}`);
    break;
  }
  case 'context':
    process.stdout.write(await call(`/api/context?${query({ q: rest.join(' '), private: values.private ? '1' : '' })}`));
    break;
  default:
    console.log(USAGE);
    if (command && !values.help) process.exit(1);
}
