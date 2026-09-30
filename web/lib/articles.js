/**
 * Accès aux articles — chaîne de repli :
 *   1. Supabase (production, base partagée avec l'agent)
 *   2. API de l'agent (backend Render) — le site reste vivant même sans Supabase
 *   3. Seed local embarqué (démo / build)
 */
import { SEED_ARTICLES } from './seed';

const SUPA_URL = process.env.SUPABASE_URL || '';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || '';
const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');

async function fetchJSON(url, opts = {}, timeout = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fromSupabase(path) {
  if (!SUPA_URL || !SUPA_KEY) return null;
  return fetchJSON(`${SUPA_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
}

async function fromAgent(path) {
  if (!AGENT_URL) return null;
  return fetchJSON(`${AGENT_URL}${path}`);
}

function normalize(a) {
  if (!a) return null;
  const created = a.created_at || a.published_at || new Date().toISOString();
  return {
    ...a,
    faq: Array.isArray(a.faq) ? a.faq : typeof a.faq === 'string' ? safeParse(a.faq) : [],
    tags: Array.isArray(a.tags) ? a.tags : [],
    keywords: Array.isArray(a.keywords) ? a.keywords : [],
    created_at: created,
    published_at: a.published_at || created,
    updated_at: a.updated_at || created,
    word_count: a.word_count || countWords(a.content_md),
  };
}

const safeParse = (s) => {
  try { return JSON.parse(s); } catch { return []; }
};
const countWords = (md) =>
  String(md || '').replace(/[#*`>\[\]()!-]/g, '').split(/\s+/).filter(Boolean).length;

/** Liste des articles publiés. */
export async function getArticles({ limit = 100, category } = {}) {
  let rows = await fromSupabase(
    `articles?select=*&status=eq.published&order=published_at.desc&limit=${limit}`
  );
  if (!rows) rows = await fromAgent(`/articles?limit=${limit}`);
  if (!rows) rows = SEED_ARTICLES;

  let list = (Array.isArray(rows) ? rows : []).filter((a) => a.status === 'published').map(normalize);
  if (category) list = list.filter((a) => a.category === category);
  // dédoublonnage par slug
  const seen = new Set();
  list = list.filter((a) => (a.slug && !seen.has(a.slug) ? (seen.add(a.slug), true) : false));
  return list.slice(0, limit);
}

/** Un article par slug. */
export async function getArticle(slug) {
  if (!slug) return null;
  let a = await fromSupabase(`articles?select=*&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  if (Array.isArray(a)) a = a[0];
  if (!a) a = await fromAgent(`/articles/${encodeURIComponent(slug)}`);
  if (!a) a = SEED_ARTICLES.find((x) => x.slug === slug) || null;
  return normalize(a);
}

/** Articles liés (même catégorie, puis plus récents). */
export async function getRelated(article, n = 3) {
  const all = await getArticles({ limit: 40 });
  const same = all.filter((a) => a.slug !== article.slug && a.category === article.category);
  const rest = all.filter((a) => a.slug !== article.slug && a.category !== article.category);
  return [...same, ...rest].slice(0, n);
}

export function readingTime(article) {
  const w = article.word_count || countWords(article.content_md);
  return Math.max(1, Math.round(w / 200));
}
