/**
 * Couche de stockage : Supabase (Postgres) si configuré, sinon fichiers JSON locaux.
 * Même interface dans les deux cas -> l'agent fonctionne partout (dev, Render, Vercel).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config, DATA_DIR, hasSupabase } from './config.js';

const file = (n) => path.join(DATA_DIR, `${n}.json`);

async function readJSON(name, fallback) {
  try {
    return JSON.parse(await fs.readFile(file(name), 'utf8'));
  } catch {
    return fallback;
  }
}
async function writeJSON(name, data) {
  await fs.writeFile(file(name), JSON.stringify(data, null, 2));
}

const uid = () => crypto.randomUUID();

// ---------------------- Supabase REST helper ----------------------
async function sb(method, table, { query = '', body, prefer } = {}) {
  const base = `${config.supabase.url}/rest/v1/${table}${query}`;
  const res = await fetch(base, {
    method,
    headers: {
      apikey: config.supabase.serviceKey,
      Authorization: `Bearer ${config.supabase.serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${method} ${table} -> ${res.status} ${text.slice(0, 300)}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

// ---------------------------- Store -------------------------------
export const store = {
  mode: () => (hasSupabase() ? 'supabase' : 'file'),

  async init() {
    for (const n of ['articles', 'tasks', 'runs']) {
      if (!(await fs.stat(file(n)).catch(() => null))) await writeJSON(n, []);
    }
  },

  // ----- articles -----
  async listArticles({ status, limit = 200 } = {}) {
    if (hasSupabase()) {
      const filters = [];
      if (status) filters.push(`status=eq.${status}`);
      return sb('GET', 'articles', {
        query: `?select=*&order=created_at.desc${filters.length ? `&${filters.join('&')}` : ''}&limit=${limit}`,
      });
    }
    let rows = await readJSON('articles', []);
    if (status) rows = rows.filter((a) => a.status === status);
    return rows.slice(0, limit);
  },

  async getArticle(slug) {
    if (hasSupabase()) {
      const rows = await sb('GET', 'articles', { query: `?slug=eq.${encodeURIComponent(slug)}&select=*` });
      return rows?.[0] || null;
    }
    const rows = await readJSON('articles', []);
    return rows.find((a) => a.slug === slug) || null;
  },

  async upsertArticle(article) {
    const now = new Date().toISOString();
    const row = {
      ...article,
      id: article.id || uid(),
      updated_at: now,
      created_at: article.created_at || now,
      published_at:
        article.status === 'published'
          ? article.published_at || now
          : article.published_at || null,
    };
    if (hasSupabase()) {
      await sb('POST', 'articles', { body: row, prefer: 'resolution=merge-duplicates,return=minimal' });
      return row;
    }
    const rows = await readJSON('articles', []);
    const i = rows.findIndex((a) => a.slug === row.slug || a.id === row.id);
    if (i >= 0) rows[i] = { ...rows[i], ...row };
    else rows.unshift(row);
    await writeJSON('articles', rows);
    return row;
  },

  // ----- tasks -----
  async listTasks({ status, limit = 100 } = {}) {
    if (hasSupabase()) {
      const q = status ? `&status=eq.${status}` : '';
      return sb('GET', 'agent_tasks', {
        query: `?select=*&order=priority.desc,created_at.asc${q}&limit=${limit}`,
      });
    }
    let rows = await readJSON('tasks', []);
    if (status) rows = rows.filter((t) => t.status === status);
    return rows.slice(0, limit);
  },

  async addTasks(tasks) {
    const clean = tasks.map((t) => ({
      id: uid(),
      type: t.type || 'write',
      keyword: t.keyword || '',
      category: t.category || 'general',
      priority: t.priority ?? 5,
      status: 'pending',
      attempts: 0,
      payload: t.payload || {},
      error: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    if (!clean.length) return [];
    if (hasSupabase()) {
      await sb('POST', 'agent_tasks', { body: clean, prefer: 'resolution=merge-duplicates,return=minimal' });
      return clean;
    }
    const rows = await readJSON('tasks', []);
    const known = new Set(rows.map((t) => `${t.type}:${t.keyword}`));
    const fresh = clean.filter((t) => !known.has(`${t.type}:${t.keyword}`));
    await writeJSON('tasks', [...fresh, ...rows]);
    return fresh;
  },

  async updateTask(id, patch) {
    const upd = { ...patch, updated_at: new Date().toISOString() };
    if (hasSupabase()) {
      await sb('PATCH', 'agent_tasks', { query: `?id=eq.${id}`, body: upd, prefer: 'return=minimal' });
      return;
    }
    const rows = await readJSON('tasks', []);
    const i = rows.findIndex((t) => t.id === id);
    if (i >= 0) { rows[i] = { ...rows[i], ...upd }; await writeJSON('tasks', rows); }
  },

  // ----- runs -----
  async recordRun(run) {
    const row = { id: uid(), ...run };
    if (hasSupabase()) {
      try {
        await sb('POST', 'agent_runs', { body: row, prefer: 'resolution=merge-duplicates,return=minimal' });
      } catch (e) {
        console.error('[store] run insert failed:', e.message);
      }
      return row;
    }
    const rows = await readJSON('runs', []);
    rows.unshift(row);
    await writeJSON('runs', rows.slice(0, config.maxRunsKeep));
    return row;
  },

  async listRuns(limit = 20) {
    if (hasSupabase()) {
      try {
        return await sb('GET', 'agent_runs', { query: `?select=*&order=started_at.desc&limit=${limit}` });
      } catch {
        return [];
      }
    }
    return (await readJSON('runs', [])).slice(0, limit);
  },

  // ----- settings -----
  async getSetting(key, fallback = null) {
    if (hasSupabase()) {
      try {
        const rows = await sb('GET', 'settings', { query: `?select=value&key=eq.${key}` });
        return rows?.[0]?.value ?? fallback;
      } catch {
        return fallback;
      }
    }
    const all = await readJSON('settings', {});
    return all[key] ?? fallback;
  },

  async setSetting(key, value) {
    if (hasSupabase()) {
      await sb('POST', 'settings', {
        body: { key, value, updated_at: new Date().toISOString() },
        prefer: 'resolution=merge-duplicates,return=minimal',
      });
      return;
    }
    const all = await readJSON('settings', {});
    all[key] = value;
    await writeJSON('settings', all);
  },
};
