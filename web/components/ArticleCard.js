import Link from 'next/link';
import { catLabel } from '@/lib/site';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });

export default function ArticleCard({ article }) {
  return (
    <article className="card">
      <span className="cat">{catLabel(article.category)}</span>
      <h3>
        <Link href={`/blog/${article.slug}`}>{article.title}</Link>
      </h3>
      <p>{article.excerpt || article.meta_description}</p>
      <div className="meta">
        <span>{fmtDate(article.published_at || article.created_at)}</span>
        <span>•</span>
        <span>{article.word_count || 0} mots</span>
        {article.seo_score ? (
          <>
            <span>•</span>
            <span className="score">SEO {article.seo_score}</span>
          </>
        ) : null}
      </div>
    </article>
  );
}
