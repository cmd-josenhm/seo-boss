/**
 * Accès aux articles — modèle « bibliothèque ».
 *
 * Deux sources, FUSIONNÉES (jamais l'une OU l'autre) :
 *   1. l'API du backend agent (base SQLite, hébergée sur Render) ;
 *   2. le catalogue de secours versionné dans le dépôt (`lib/seed.js`).
 *
 * Pourquoi fusionner ? Parce qu'un article publié ne doit JAMAIS disparaître :
 * si l'hébergeur réinitialise la base (ou si le service est en veille), le site
 * continue d'afficher tout l'historique, et les nouveaux articles s'ajoutent
 * par-dessus. Les anciens contenus restent donc indexables en permanence.
 */
import { SEED_ARTICLES } from './seed';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');

async function fetchJSON(url, opts = {}, timeout = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal, ...(opts.cache ? {} : { next: { revalidate: 300 } }) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fromAgent(path) {
  if (!AGENT_URL) return null;
  return fetchJSON(`${AGENT_URL}${path}`);
}

const safeParse = (s, d = []) => {
  try {
    return typeof s === 'string' ? JSON.parse(s) : d;
  } catch {
    return d;
  }
};
const countWords = (md) =>
  String(md || '').replace(/[#*`>\[\]()!-]/g, '').split(/\s+/).filter(Boolean).length;

function normalize(a) {
  if (!a) return null;
  const created = a.created_at || a.published_at || new Date().toISOString();
  return {
    ...a,
    faq: Array.isArray(a.faq) ? a.faq : typeof a.faq === 'string' ? safeParse(a.faq) : [],
    tags: Array.isArray(a.tags) ? a.tags : safeParse(a.tags, []),
    keywords: Array.isArray(a.keywords) ? a.keywords : safeParse(a.keywords, []),
    created_at: created,
    published_at: a.published_at || created,
    updated_at: a.updated_at || created,
    word_count: a.word_count || countWords(a.content_md),
  };
}

const ts = (a) => Date.parse(a.updated_at || a.published_at || a.created_at || 0) || 0;

/** Fusionne deux catalogues : les articles du backend priment, rien n'est perdu. */
function mergeCatalogs(primary = [], fallback = []) {
  const bySlug = new Map();
  for (const raw of [...primary, ...fallback]) {
    const a = normalize(raw);
    if (!a?.slug) continue;
    const prev = bySlug.get(a.slug);
    if (!prev || ts(a) >= ts(prev)) bySlug.set(a.slug, a);
  }
  return [...bySlug.values()].sort((a, b) => ts(b) - ts(a));
}

const publishedOnly = (list) => list.filter((a) => (a.status || 'published') === 'published');

/** Liste des articles publiés (backend + sauvegarde locale, dédoublonnée). */
export async function getArticles({ limit = 100, category } = {}) {
  const rows = await fromAgent(`/articles?limit=500&status=published`);
  let list = mergeCatalogs(Array.isArray(rows) ? rows : [], SEED_ARTICLES);
  list = publishedOnly(list);
  if (category) list = list.filter((a) => a.category === category);
  return list.slice(0, limit);
}

/** Un article par slug — jamais de perte : repli sur le catalogue versionné. */
export async function getArticle(slug) {
  if (!slug) return null;
  const a = await fromAgent(`/articles/${encodeURIComponent(slug)}`);
  if (a && a.slug && (a.status || 'published') === 'published') return normalize(a);
  // backend en veille ou base réinitialisée : on sert la version archivée
  const archived = SEED_ARTICLES.find((x) => x.slug === slug);
  return archived ? normalize(archived) : null;
}

/** Articles liés (même catégorie, puis plus récents). */
export async function getRelated(article, n = 3) {
  const all = await getArticles({ limit: 200 });
  const same = all.filter((a) => a.slug !== article.slug && a.category === article.category);
  const rest = all.filter((a) => a.slug !== article.slug && a.category !== article.category);
  return [...same, ...rest].slice(0, n);
}

/** Tous les slugs publiés (sitemap). */
export async function getAllSlugs() {
  const all = await getArticles({ limit: 5000 });
  return all.map((a) => a.slug);
}

export function readingTime(article) {
  const w = article.word_count || countWords(article.content_md);
  return Math.max(1, Math.round(w / 200));
}
