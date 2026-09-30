import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/lib/articles';
import { CATEGORIES, ALL_CATEGORIES, catLabel, catDesc, catAccent } from '@/lib/site';

export const revalidate = 300;

export async function generateStaticParams() {
  return ALL_CATEGORIES.map((c) => ({ slug: c.id }));
}

export async function generateMetadata({ params }) {
  const cat = ALL_CATEGORIES.find((c) => c.id === params.slug);
  if (!cat) return {};
  return {
    title: `${cat.label} — guides et astuces`,
    description: cat.desc,
    alternates: { canonical: `/category/${cat.id}` },
  };
}

export default async function CategoryPage({ params }) {
  const cat = ALL_CATEGORIES.find((c) => c.id === params.slug);
  if (!cat) notFound();
  const articles = await getArticles({ limit: 200, category: cat.id });

  return (
    <div className="container">
      <div className="cat-hero" style={{ '--cat-accent': catAccent(cat.id) }}>
        <h1>{catLabel(cat.id)}</h1>
        <p>{catDesc(cat.id)}</p>
        <p style={{ marginTop: 12, color: '#e7fff5', fontWeight: 700 }}>
          {articles.length} {articles.length > 1 ? 'guides disponibles' : 'guide disponible'}
        </p>
      </div>

      <div className="filter-bar">
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`/category/${c.id}`} className={`pill${c.id === cat.id ? ' is-active' : ''}`}>
            <span className="swatch" style={{ background: c.accent }} />
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
        {!articles.length && (
          <div className="empty">
            Aucun guide publié dans cette catégorie pour le moment.{' '}
            <Link href="/blog">Voir tous les guides</Link>
          </div>
        )}
      </section>
    </div>
  );
}
