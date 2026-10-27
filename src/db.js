import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const KINDS = {
  personality: '성격',
  job: '직업',
  family: '가족',
  skill: '기술',
  together: '함께한 일',
  conversation: '대화 요약',
  note: '기타',
};
const VISIBILITY = ['normal', 'private'];
const SOURCES = ['web', 'cli', 'vscode', 'chrome', 'mcp', 'api'];
const MAX_CONTENT = 2000;

export class ValidationError extends Error {}

export function openStore(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      visibility TEXT NOT NULL DEFAULT 'normal',
      source TEXT NOT NULL DEFAULT 'api',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  function clean(input, base = {}) {
    const m = { ...base, ...input };
    m.content = String(m.content ?? '').trim();
    m.kind = m.kind ?? 'note';
    m.tags = normalizeTags(m.tags);
    m.visibility = m.visibility ?? 'normal';
    m.source = m.source ?? 'api';
    if (!m.content) throw new ValidationError('content가 비어 있습니다.');
    if (m.content.length > MAX_CONTENT) throw new ValidationError(`content는 ${MAX_CONTENT}자 이하여야 합니다.`);
    if (!(m.kind in KINDS)) throw new ValidationError(`kind는 ${Object.keys(KINDS).join(', ')} 중 하나여야 합니다.`);
    if (!VISIBILITY.includes(m.visibility)) throw new ValidationError('visibility는 normal 또는 private 입니다.');
    if (!SOURCES.includes(m.source)) throw new ValidationError(`source는 ${SOURCES.join(', ')} 중 하나여야 합니다.`);
    return m;
  }

  return {
    count: () => db.prepare('SELECT COUNT(*) AS n FROM memories').get().n,

    list({ q = '', kind = '', includePrivate = true, limit = 200 } = {}) {
      const where = [];
      const params = [];
      for (const word of String(q).trim().split(/\s+/).filter(Boolean)) {
        where.push(`(content LIKE ? ESCAPE '\\' OR tags LIKE ? ESCAPE '\\')`);
        const like = `%${word.replace(/[\\%_]/g, '\\$&')}%`;
        params.push(like, like);
      }
      if (kind) { where.push('kind = ?'); params.push(kind); }
      if (!includePrivate) where.push(`visibility = 'normal'`);
      const sql = `SELECT * FROM memories ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY id DESC LIMIT ?`;
      return db.prepare(sql).all(...params, Math.min(Number(limit) || 200, 1000));
    },

    get: (id) => db.prepare('SELECT * FROM memories WHERE id = ?').get(Number(id)),

    add(input) {
      const m = clean(input);
      const now = new Date().toISOString();
      const { lastInsertRowid } = db.prepare(
        `INSERT INTO memories (kind, content, tags, visibility, source, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(m.kind, m.content, m.tags, m.visibility, m.source, now, now);
      return this.get(lastInsertRowid);
    },

    update(id, input) {
      const current = this.get(id);
      if (!current) return null;
      const m = clean(input, current);
      db.prepare(
        `UPDATE memories SET kind = ?, content = ?, tags = ?, visibility = ?, updated_at = ? WHERE id = ?`,
      ).run(m.kind, m.content, m.tags, m.visibility, new Date().toISOString(), current.id);
      return this.get(id);
    },

    remove: (id) => db.prepare('DELETE FROM memories WHERE id = ?').run(Number(id)).changes > 0,

    close: () => db.close(),
  };
}

function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? '').split(',');
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].join(',');
}

// 다른 AI에게 붙여넣을 "나에 대한 기억" Markdown
export function toContext(memories) {
  if (!memories.length) return '# 나에 대한 기억 (Mnemo)\n\n아직 저장된 기억이 없습니다.\n';
  const lines = [
    '# 나에 대한 기억 (Mnemo)',
    '',
    '아래는 사용자에 대해 저장된 기억이다. 답변할 때 이 맥락을 참고하고, 기억과 다른 내용은 사용자에게 확인한다.',
  ];
  for (const [kind, label] of Object.entries(KINDS)) {
    const items = memories.filter((m) => m.kind === kind);
    if (!items.length) continue;
    lines.push('', `## ${label}`);
    for (const m of items) lines.push(`- ${m.content.replace(/\s*\n\s*/g, ' ')}${m.tags ? ` _(${m.tags})_` : ''}`);
  }
  return lines.join('\n') + '\n';
}
