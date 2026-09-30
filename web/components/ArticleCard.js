import Link from 'next/link';
import { catLabel, catAccent } from '@/lib/site';
import { readingTime } from '@/lib/articles';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });

export default function ArticleCard({ article, featured = false }) {
  const accent = catAccent(article.category);
  return (
    <article
      className={`card${featured ? ' featured' : ''}`}
      style={{ '--cat-accent': accent }}
    >
      <span className="cat">{catLabel(article.category)}</span>
      <h3>
        <Link href={`/blog/${article.slug}`}>{article.title}</Link>
      </h3>
      <p>{article.excerpt || article.meta_description}</p>
      <div className="meta">
        <time dateTime={article.published_at || article.created_at}>
          {fmtDate(article.published_at || article.created_at)}
        </time>
        <span className="dot-sep">•</span>
        <span>{readingTime(article)} min de lecture</span>
      </div>
    </article>
  );
}
