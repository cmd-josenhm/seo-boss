/**
 * Outils SEO : score on-page, liens internes, rafraîchissement de contenu.
 */
import { completeJSON, extractJSON } from '../providers.js';

export function seoScore(article) {
  const t = String(article.title || '');
  const m = String(article.meta_description || '');
  const c = String(article.content_md || '');
  const faq = Array.isArray(article.faq) ? article.faq.length : 0;
  const kw = (article.keywords && article.keywords[0]) || '';
  let s = 0;
  if (t.length >= 30 && t.length <= 65) s += 15;
  else if (t.length) s += 6;
  if (m.length >= 120 && m.length <= 160) s += 15;
  else if (m.length) s += 6;
  if (kw && t.toLowerCase().includes(kw.toLowerCase().split(' ')[0])) s += 10;
  if (c.length > 3000) s += 15;
  else if (c.length > 1500) s += 8;
  const h2 = (c.match(/^## /gm) || []).length;
  if (h2 >= 4) s += 15;
  else if (h2 >= 2) s += 8;
  if (c.includes('- ') || c.includes('1. ')) s += 5;
  if (/\*\*[^*]+\*\*/.test(c)) s += 5;
  if (faq >= 3) s += 10;
  if (article.slug && article.slug.split('-').length >= 3) s += 5;
  if (/\?\?|\bTODO\b|\[object Object\]/.test(c)) s -= 20;
  return Math.max(0, Math.min(100, s));
}

/** Ajoute une section "Articles liés" avec 2-4 liens internes si absente. */
export function addInternalLinks(article, others) {
  const links = others
    .filter((a) => a.slug !== article.slug && a.status === 'published')
    .slice(0, 3);
  if (!links.length) return { article, changed: false };
  let content = article.content_md || '';
  if (content.includes('/blog/')) return { article, changed: false };
  const section =
    `\n\n## Articles liés\n\n` +
    links.map((a) => `- [${a.title}](/blog/${a.slug})`).join('\n');
  return { article: { ...article, content_md: content + section }, changed: true };
}

/** Demande au LLM une amélioration SEO ciblée (si dispo), sinon retourne null. */
export async function refreshWithLLM(article, relatedTitles) {
  const sys = `Tu es expert SEO. Tu renvoies UNIQUEMENT du JSON : {"meta_description":"<=155 car","seo_title":"<=60 car","content_md":"article complet"} avec le contenu intégralement enrichi.`;
  const user = `Améliore cet article (garde la structure Markdown, ajoute 1-2 liens internes naturels et une accroche en intro) :
Titre : ${article.title}
Mots-clés : ${(article.keywords || []).join(', ')}
Articles liés disponibles : ${relatedTitles.join(' | ')}
Contenu :
${String(article.content_md || '').slice(0, 6000)}`;
  const { json, provider } = await completeJSON(sys, user);
  if (json && json.content_md && json.content_md.length > 500) return { ...json, _provider: provider };
  return null;
}

export { extractJSON };
