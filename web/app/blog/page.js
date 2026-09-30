import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/lib/articles';
import { CATEGORIES } from '@/lib/site';

export const revalidate = 300;

export const metadata = {
  title: 'Tous les guides pratiques',
  description:
    'Guides pratiques religion, IA, freelance, business et réseaux sociaux pour réussir en Afrique — des contenus conservés et enrichis en continu.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage({ searchParams }) {
  const q = (searchParams?.q || '').toLowerCase().trim();
  const articles = await getArticles({ limit: 500 });
  const filtered = q
    ? articles.filter((a) =>
        [a.title, a.excerpt, a.meta_description, (a.keywords || []).join(' '), (a.tags || []).join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
    : articles;

  return (
    <div className="container">
      <div className="page-head">
        <h1>Tous les guides</h1>
        <p>
          {filtered.length} {filtered.length > 1 ? 'guides' : 'guide'} — un catalogue qui ne perd
          jamais un article : chaque nouveau contenu s&apos;ajoute aux précédents.
        </p>
      </div>

      <div className="filter-bar">
        <Link href="/blog" className="pill is-active">
          Tous
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`/category/${c.id}`} className="pill">
            <span className="swatch" style={{ background: c.accent }} />
            {c.label}
          </Link>
        ))}
      </div>

      {q && (
        <p className="page-head" style={{ paddingTop: 12, color: 'var(--muted)' }}>
          Recherche : « {q} » — <Link href="/blog">réinitialiser</Link>
        </p>
      )}

      <section className="section">
        <div className="grid">
          {filtered.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
        {!filtered.length && (
          <div className="empty">
            Aucun article ne correspond à « {q} ». <Link href="/blog">Voir tous les guides</Link>
          </div>
        )}
      </section>
    </div>
  );
}
