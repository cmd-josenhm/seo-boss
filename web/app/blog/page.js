import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/lib/articles';
import { CATEGORIES } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tous les guides pratiques',
  description:
    'Guides pratiques mobile money, IA, freelance, business et réseaux sociaux pour réussir en Afrique — mis à jour par notre agent IA.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage({ searchParams }) {
  const q = (searchParams?.q || '').toLowerCase().trim();
  let articles = await getArticles({ limit: 200 });
  if (q) {
    articles = articles.filter((a) =>
      [a.title, a.excerpt, a.meta_description, (a.keywords || []).join(' '), (a.tags || []).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  return (
    <div className="container">
      <div className="page-title">
        <h1>Guides pratiques</h1>
        <p>
          {articles.length} article{articles.length > 1 ? 's' : ''} — recherche continue des
          meilleurs mots-clés Afrique par l’agent IA.
        </p>
      </div>

      <div className="pills" style={{ margin: '18px 0 6px' }}>
        <Link href="/blog" className="pill" style={{ background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }}>
          Tous
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`/category/${c.id}`} className="pill">
            {c.label}
          </Link>
        ))}
      </div>

      <section className="section">
        <div className="grid">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
        {!articles.length && <div className="empty">Aucun article ne correspond à « {q} ».</div>}
      </section>
    </div>
  );
}
