import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/lib/articles';
import { CATEGORIES, catLabel, catDesc } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const cat = CATEGORIES.find((c) => c.id === params.slug);
  if (!cat) return {};
  return {
    title: `${cat.label} — guides et astuces`,
    description: cat.desc,
    alternates: { canonical: `/category/${cat.id}` },
  };
}

export default async function CategoryPage({ params }) {
  const cat = CATEGORIES.find((c) => c.id === params.slug);
  if (!cat) notFound();
  const articles = await getArticles({ limit: 100, category: cat.id });

  return (
    <div className="container">
      <div className="cat-hero">
        <h1>{catLabel(cat.id)}</h1>
        <p>{catDesc(cat.id)}</p>
      </div>

      <div className="pills" style={{ marginBottom: 8 }}>
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.id}`}
            className="pill"
            style={
              c.id === cat.id
                ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' }
                : undefined
            }
          >
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
        {!articles.length && <div className="empty">L’agent IA rédige les premiers articles de cette catégorie…</div>}
      </section>
    </div>
  );
}
