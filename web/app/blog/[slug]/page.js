import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getArticle, getRelated, getAllSlugs, readingTime } from '@/lib/articles';
import { SITE, catLabel } from '@/lib/site';
import { mdToHtml, slugifyHeading } from '@/lib/md';
import ArticleCard from '@/components/ArticleCard';
import JsonLd, { articleJsonLd, faqJsonLd, breadcrumbJsonLd } from '@/components/JsonLd';

export const revalidate = 300;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

/** Pré-génère les articles connus (les nouveaux restent rendus à la demande). */
export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.slice(0, 100).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const article = await getArticle(params.slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.meta_description || article.excerpt,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.meta_description || article.excerpt,
      url: `${SITE.url}/blog/${article.slug}`,
      publishedTime: article.published_at || article.created_at,
      modifiedTime: article.updated_at,
      section: catLabel(article.category),
      tags: article.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.meta_description || article.excerpt,
    },
  };
}

export default async function ArticlePage({ params }) {
  const article = await getArticle(params.slug);
  if (!article || article.status !== 'published') notFound();

  const related = await getRelated(article, 3);
  const html = mdToHtml(article.content_md);
  const headings = [...article.content_md.matchAll(/^##\s+(.*)$/gm)].map((m) => ({
    text: m[1],
    id: slugifyHeading(m[1]),
  }));
  const url = `${SITE.url}/blog/${article.slug}`;
  const crumbs = [
    { name: 'Accueil', path: '/' },
    { name: catLabel(article.category), path: `/category/${article.category}` },
    { name: article.title, path: `/blog/${article.slug}` },
  ];
  const faq = article.faq || [];

  return (
    <article className="container narrow">
      <JsonLd data={articleJsonLd(article, SITE.url)} />
      {faq.length ? <JsonLd data={faqJsonLd(faq)} /> : null}
      <JsonLd data={breadcrumbJsonLd(crumbs, SITE.url)} />

      <header className="article-head">
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link> <span>›</span>
          <Link href={`/category/${article.category}`}>{catLabel(article.category)}</Link> <span>›</span>
          <span>{article.title}</span>
        </nav>
        <h1>{article.title}</h1>
        <p className="article-lede">{article.excerpt || article.meta_description}</p>
        <div className="meta-row">
          <span>Par {article.author || 'BuzzAfrique'}</span>
          <span className="dot-sep">•</span>
          <time dateTime={article.published_at || article.created_at}>
            {fmtDate(article.published_at || article.created_at)}
          </time>
          <span className="dot-sep">•</span>
          <span>{readingTime(article)} min de lecture</span>
        </div>
      </header>

      {headings.length >= 3 && (
        <nav className="toc" aria-label="Sommaire">
          <strong>Dans ce guide</strong>
          <ul>
            {headings.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`}>{h.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* eslint-disable-next-line react/no-danger */}
      <div className="content" dangerouslySetInnerHTML={{ __html: html }} />

      <div className="share">
        <a
          className="wa"
          href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${url}`)}`}
          target="_blank"
          rel="noopener"
        >
          Partager sur WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${url}`}
          target="_blank"
          rel="noopener"
        >
          Facebook
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${url}&text=${encodeURIComponent(article.title)}`}
          target="_blank"
          rel="noopener"
        >
          X
        </a>
      </div>

      {faq.length > 0 && (
        <section className="faq">
          <h2>Questions fréquentes</h2>
          {faq.map((f, i) => (
            <details key={i} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section className="related">
          <div className="section-head">
            <div>
              <span className="eyebrow">À lire aussi</span>
              <h2>Guides similaires</h2>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))' }}>
            {related.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
