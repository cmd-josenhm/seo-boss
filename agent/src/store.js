/**
 * Base de données DU BACKEND — SQLite embarqué (better-sqlite3).
 * Aucun service externe : tout vit dans le processus de l'agent.
 *   - fichier : agent/data/seo-boss.db   (variable DB_PATH pour le déplacer)
 *   - mode WAL, écritures atomiques, requêtes préparées
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config, DATA_DIR } from './config.js';

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'seo-boss.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id              TEXT PRIMARY KEY,
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  excerpt         TEXT DEFAULT '',
  content_md      TEXT DEFAULT '',
  category        TEXT DEFAULT 'general',
  tags            TEXT DEFAULT '[]',
  keywords        TEXT DEFAULT '[]',
  meta_description TEXT DEFAULT '',
  faq             TEXT DEFAULT '[]',
  status          TEXT DEFAULT 'draft',
  author          TEXT DEFAULT 'BuzzAfrique',
  lang            TEXT DEFAULT 'fr',
  word_count      INTEGER DEFAULT 0,
  seo_score       INTEGER DEFAULT 0,
  source          TEXT DEFAULT 'agent',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  published_at    TEXT
);
CREATE INDEX IF NOT EXISTS articles_status_idx ON articles(status);
CREATE INDEX IF NOT EXISTS articles_published_idx ON articles(published_at DESC);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,
  keyword    TEXT DEFAULT '',
  category   TEXT DEFAULT 'general',
  priority   INTEGER DEFAULT 5,
  status     TEXT DEFAULT 'pending',
  attempts   INTEGER DEFAULT 0,
  payload    TEXT DEFAULT '{}',
  error      TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON agent_tasks(status, priority DESC, created_at ASC);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_uniq ON agent_tasks(type, keyword);

CREATE TABLE IF NOT EXISTS agent_runs (
  id               TEXT PRIMARY KEY,
  started_at       TEXT DEFAULT (datetime('now')),
  finished_at      TEXT,
  status           TEXT DEFAULT 'running',
  provider         TEXT DEFAULT '',
  articles_created INTEGER DEFAULT 0,
  articles_updated INTEGER DEFAULT 0,
  tasks_done       INTEGER DEFAULT 0,
  log              TEXT DEFAULT '[]',
  error            TEXT
);
CREATE INDEX IF NOT EXISTS runs_started_idx ON agent_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS page_views (
  path  TEXT NOT NULL,
  day   TEXT NOT NULL DEFAULT (date('now')),
  views INTEGER DEFAULT 1,
  PRIMARY KEY (path, day)
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
`);

const uid = () => crypto.randomUUID();
const J = (v, d) => {
  if (v == null) return d;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return d; }
};

/** Sérialise les champs JSON avant écriture. */
function ser(row) {
  const out = { ...row };
  for (const k of ['tags', 'keywords', 'faq', 'payload', 'log']) {
    if (k in out && typeof out[k] !== 'string') out[k] = JSON.stringify(out[k] ?? null);
  }
  return out;
}
/** Parse les champs JSON après lecture. */
function deser(row) {
  if (!row) return row;
  const out = { ...row };
  out.tags = J(out.tags, []);
  out.keywords = J(out.keywords, []);
  out.faq = J(out.faq, []);
  out.payload = J(out.payload, {});
  out.log = J(out.log, []);
  return out;
}

const upsertArticleStmt = () => db.prepare(`
  INSERT INTO articles (id, slug, title, excerpt, content_md, category, tags, keywords,
    meta_description, faq, status, author, lang, word_count, seo_score, source,
    created_at, updated_at, published_at)
  VALUES (@id, @slug, @title, @excerpt, @content_md, @category, @tags, @keywords,
    @meta_description, @faq, @status, @author, @lang, @word_count, @seo_score, @source,
    @created_at, @updated_at, @published_at)
  ON CONFLICT(id) DO UPDATE SET
    slug=excluded.slug, title=excluded.title, excerpt=excluded.excerpt,
    content_md=excluded.content_md, category=excluded.category, tags=excluded.tags,
    keywords=excluded.keywords, meta_description=excluded.meta_description,
    faq=excluded.faq, status=excluded.status, author=excluded.author, lang=excluded.lang,
    word_count=excluded.word_count, seo_score=excluded.seo_score, source=excluded.source,
    updated_at=excluded.updated_at, published_at=excluded.published_at
`);

export const store = {
  mode: () => 'sqlite',
  info: () => ({ engine: 'sqlite', path: DB_PATH }),

  async init() {
    // les tables sont créées au chargement du module
    const n = db.prepare('SELECT COUNT(*) c FROM articles').get().c;
    if (config.verbose !== false) console.log(`[db] SQLite prêt (${DB_PATH}) — ${n} article(s)`);
  },

  // ------------------------- articles -------------------------
  async listArticles({ status, limit = 200 } = {}) {
    const rows = status
      ? db.prepare('SELECT * FROM articles WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit)
      : db.prepare('SELECT * FROM articles ORDER BY created_at DESC LIMIT ?').all(limit);
    return rows.map(deser);
  },

  async getArticle(slug) {
    return deser(db.prepare('SELECT * FROM articles WHERE slug = ?').get(slug));
  },

  async upsertArticle(article) {
    const now = new Date().toISOString();
    const row = {
      id: article.id || uid(),
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt || '',
      content_md: article.content_md || '',
      category: article.category || 'general',
      tags: JSON.stringify(article.tags || []),
      keywords: JSON.stringify(article.keywords || []),
      meta_description: article.meta_description || '',
      faq: JSON.stringify(article.faq || []),
      status: article.status || 'draft',
      author: article.author || 'BuzzAfrique',
      lang: article.lang || 'fr',
      word_count: article.word_count || 0,
      seo_score: article.seo_score || 0,
      source: article.source || 'agent',
      created_at: article.created_at || now,
      updated_at: now,
      published_at:
        article.status === 'published'
          ? article.published_at || now
          : article.published_at || null,
    };
    // si le slug existe déjà sous un autre id, on garde l'id d'origine (clé d'unicité)
    const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(row.slug);
    if (existing) row.id = existing.id;

    upsertArticleStmt().run(row);
    return deser(db.prepare('SELECT * FROM articles WHERE id = ?').get(row.id));
  },

  // -------------------------- tasks ---------------------------
  async listTasks({ status, limit = 100 } = {}) {
    const rows = status
      ? db.prepare('SELECT * FROM agent_tasks WHERE status = ? ORDER BY priority DESC, created_at ASC LIMIT ?').all(status, limit)
      : db.prepare('SELECT * FROM agent_tasks ORDER BY priority DESC, created_at ASC LIMIT ?').all(limit);
    return rows.map(deser);
  },

  async addTasks(tasks) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO agent_tasks (id, type, keyword, category, priority, status, attempts, payload, error, created_at, updated_at)
      VALUES (@id, @type, @keyword, @category, @priority, @status, @attempts, @payload, @error, @created_at, @updated_at)
    `);
    const now = new Date().toISOString();
    const inserted = [];
    const tx = db.transaction((list) => {
      for (const t of list) {
        const row = ser({
          id: uid(),
          type: t.type || 'write',
          keyword: t.keyword || '',
          category: t.category || 'general',
          priority: t.priority ?? 5,
          status: 'pending',
          attempts: 0,
          payload: t.payload || {},
          error: '',
          created_at: now,
          updated_at: now,
        });
        const info = stmt.run(row);
        if (info.changes > 0) inserted.push(deser({ ...row }));
      }
    });
    tx(tasks);
    return inserted;
  },

  async updateTask(id, patch) {
    const fields = [];
    const vals = [];
    const data = { ...patch, updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(data)) {
      if (k === 'id') continue;
      fields.push(`${k} = ?`);
      vals.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
    }
    vals.push(id);
    db.prepare(`UPDATE agent_tasks SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  },

  // -------------------------- runs ----------------------------
  async recordRun(run) {
    const row = ser({
      id: uid(),
      started_at: run.started_at || new Date().toISOString(),
      finished_at: run.finished_at || null,
      status: run.status || 'success',
      provider: run.provider || '',
      articles_created: run.articles_created || 0,
      articles_updated: run.articles_updated || 0,
      tasks_done: run.tasks_done || 0,
      log: run.log || [],
      error: run.error || null,
    });
    db.prepare(`
      INSERT INTO agent_runs (id, started_at, finished_at, status, provider,
        articles_created, articles_updated, tasks_done, log, error)
      VALUES (@id, @started_at, @finished_at, @status, @provider,
        @articles_created, @articles_updated, @tasks_done, @log, @error)
    `).run(row);
    db.prepare('DELETE FROM agent_runs WHERE id NOT IN (SELECT id FROM agent_runs ORDER BY started_at DESC LIMIT ?)')
      .run(config.maxRunsKeep);
    return deser(db.prepare('SELECT * FROM agent_runs WHERE id = ?').get(row.id));
  },

  async listRuns(limit = 20) {
    return db.prepare('SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT ?')
      .all(limit)
      .map(deser);
  },

  // ------------------------ settings --------------------------
  async getSetting(key, fallback = null) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? J(row.value, fallback) : fallback;
  },

  async setSetting(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, JSON.stringify(value));
  },

  // --------------------- statistiques vues --------------------
  /** Enregistre une vue (beacon du frontend, best-effort). */
  async addView(pathName) {
    const p = String(pathName || '/').slice(0, 200);
    const day = new Date().toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO page_views (path, day, views) VALUES (?, ?, 1)
      ON CONFLICT(path, day) DO UPDATE SET views = views + 1
    `).run(p, day);
    return true;
  },

  async getViews({ days = 7 } = {}) {
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const total = db.prepare('SELECT COALESCE(SUM(views),0) v FROM page_views WHERE day >= ?').get(since).v;
    const today = db.prepare("SELECT COALESCE(SUM(views),0) v FROM page_views WHERE day = date('now')").get().v;
    const byDay = db.prepare('SELECT day, SUM(views) views FROM page_views WHERE day >= ? GROUP BY day ORDER BY day').all(since);
    const top = db.prepare('SELECT path, SUM(views) views FROM page_views WHERE day >= ? GROUP BY path ORDER BY views DESC LIMIT 10').all(since);
    return { total_7d: total, today, by_day: byDay, top_paths: top };
  },

  /** Statistiques brutes pour le dashboard. */
  async stats() {
    const one = (q) => db.prepare(q).get().c ?? 0;
    const sizeOf = (f) => (fs.existsSync(f) ? fs.statSync(f).size : 0);
    return {
      articles: one('SELECT COUNT(*) c FROM articles'),
      published: one("SELECT COUNT(*) c FROM articles WHERE status = 'published'"),
      tasks_pending: one("SELECT COUNT(*) c FROM agent_tasks WHERE status = 'pending'"),
      tasks_failed: one("SELECT COUNT(*) c FROM agent_tasks WHERE status = 'failed'"),
      runs: one('SELECT COUNT(*) c FROM agent_runs'),
      db_size_kb: Math.round(
        (sizeOf(DB_PATH) + sizeOf(DB_PATH + '-wal') + sizeOf(DB_PATH + '-shm')) / 1024
      ),
    };
  },
};
