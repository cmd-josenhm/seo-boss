import { getArticles } from '@/lib/articles';
import { SITE, CATEGORIES, LEGACY_CATEGORIES } from '@/lib/site';

export const revalidate = 1800;

export default async function sitemap() {
  const articles = await getArticles({ limit: 5000 });
  const base = SITE.url;

  // lastmod réel : date de dernière modification du contenu, pas la date du crawl
  const newest = articles[0]?.updated_at || articles[0]?.published_at || articles[0]?.created_at;
  const perCategory = new Map();
  for (const a of articles) {
    const d = a.updated_at || a.published_at || a.created_at;
    if (!perCategory.has(a.category) || Date.parse(d) > Date.parse(perCategory.get(a.category))) {
      perCategory.set(a.category, d);
    }
  }

  const staticPages = [
    { url: base, priority: 1, changeFrequency: 'daily', lastModified: newest },
    { url: `${base}/blog`, priority: 0.9, changeFrequency: 'daily', lastModified: newest },
    { url: `${base}/a-propos`, priority: 0.4, changeFrequency: 'monthly' },
    { url: `${base}/contact`, priority: 0.4, changeFrequency: 'monthly' },
  ].filter((p) => !p.lastModified || true);

  // Catégories actives + catégories historiques encore peuplées (les anciens articles
  // restent accessibles : on ne casse jamais une URL indexée)
  const categoryPages = [...CATEGORIES, ...LEGACY_CATEGORIES]
    .map((c) => ({
      url: `${base}/category/${c.id}`,
      priority: c.legacy ? 0.5 : 0.8,
      changeFrequency: 'weekly',
      lastModified: perCategory.get(c.id),
    }))
    .filter((c) => c.lastModified);

  const articlePages = articles.map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: a.updated_at || a.published_at || a.created_at,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...articlePages];
}
