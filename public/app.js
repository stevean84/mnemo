const $ = (id) => document.getElementById(id);
const state = { kinds: {}, kind: '', q: '' };

async function api(path, options = {}) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...options });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `요청 실패 (${res.status})`);
  }
  return res.status === 204 ? null : res.headers.get('content-type')?.includes('json') ? res.json() : res.text();
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderChips() {
  const entries = [['', '전체'], ...Object.entries(state.kinds)];
  $('chips').replaceChildren(...entries.map(([value, label]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = label;
    chip.setAttribute('aria-pressed', String(state.kind === value));
    chip.onclick = () => { state.kind = value; renderChips(); load(); };
    return chip;
  }));
}

function card(m) {
  const el = document.createElement('article');
  el.className = 'card memory';
  const head = document.createElement('div');
  head.className = 'memory-head';
  const kind = Object.assign(document.createElement('span'), { className: 'chip on', textContent: state.kinds[m.kind] ?? m.kind });
  head.append(kind);
  if (m.visibility === 'private') head.append(Object.assign(document.createElement('span'), { className: 'chip chip-private', textContent: '비공개' }));
  head.append(Object.assign(document.createElement('small'), { textContent: `${m.created_at.slice(0, 10)} · ${m.source}` }));
  const actions = Object.assign(document.createElement('div'), { className: 'actions' });
  const del = Object.assign(document.createElement('button'), { className: 'btn btn-ghost btn-danger', type: 'button', textContent: '삭제' });
  del.onclick = async () => {
    if (!confirm('이 기억을 삭제할까요?')) return;
    await api(`/api/memories/${m.id}`, { method: 'DELETE' });
    toast('삭제했습니다');
    load();
  };
  actions.append(del);
  head.append(actions);
  el.append(head, Object.assign(document.createElement('p'), { textContent: m.content }));
  if (m.tags) {
    const tags = Object.assign(document.createElement('div'), { className: 'tags meta' });
    tags.textContent = m.tags.split(',').map((t) => `#${t}`).join(' ');
    el.append(tags);
  }
  return el;
}

async function load() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.kind) params.set('kind', state.kind);
  try {
    const items = await api(`/api/memories?${params}`);
    const filtered = state.q || state.kind;
    $('summary').textContent = filtered ? `${items.length}개 찾음` : `기억 ${items.length}개`;
    if (!items.length) {
      const empty = Object.assign(document.createElement('div'), { className: 'empty' });
      empty.textContent = filtered ? '조건에 맞는 기억이 없어요.' : '아직 기억이 없어요. 첫 기억을 추가해 보세요.';
      $('list').replaceChildren(empty);
    } else {
      $('list').replaceChildren(...items.map(card));
    }
  } catch (err) {
    $('list').replaceChildren(Object.assign(document.createElement('div'), { className: 'empty', textContent: `불러오지 못했어요: ${err.message}` }));
  }
}

async function addMemory(event) {
  event?.preventDefault();
  const content = $('content').value.trim();
  if (!content) { toast('내용을 입력해 주세요'); $('content').focus(); return; }
  try {
    await api('/api/memories', {
      method: 'POST',
      body: JSON.stringify({
        content,
        kind: $('kind').value,
        tags: $('tags').value,
        visibility: $('private').checked ? 'private' : 'normal',
        source: 'web',
      }),
    });
    $('content').value = '';
    $('tags').value = '';
    $('private').checked = false;
    toast('기억했습니다');
    load();
  } catch (err) {
    toast(err.message);
  }
}

async function copyContext() {
  try {
    const md = await api('/api/context');
    await navigator.clipboard.writeText(md);
    toast('context를 복사했습니다 — AI 대화창에 붙여넣으세요');
  } catch (err) {
    toast(`복사 실패: ${err.message}`);
  }
}

async function init() {
  try {
    const health = await api('/api/health');
    state.kinds = health.kinds;
    $('status').textContent = '로컬 저장소 연결됨';
  } catch {
    $('status').textContent = '서버에 연결할 수 없어요 — ./start.sh 로 실행하세요';
    return;
  }
  $('kind').replaceChildren(...Object.entries(state.kinds).map(([value, label]) => new Option(label, value)));
  $('kind').value = 'note';
  renderChips();
  $('composer').addEventListener('submit', addMemory);
  $('content').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addMemory(e); });
  let timer;
  $('q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 200); });
  $('copy-context').addEventListener('click', copyContext);
  load();
}

init();
