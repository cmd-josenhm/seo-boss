import { getArticles } from '@/lib/articles';
import { SITE, CATEGORIES } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const articles = await getArticles({ limit: 1000 });
  const base = SITE.url;
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/a-propos`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ...CATEGORIES.map((c) => ({
      url: `${base}/category/${c.id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    })),
    ...articles.map((a) => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: new Date(a.updated_at || a.published_at || a.created_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    })),
  ];
}
