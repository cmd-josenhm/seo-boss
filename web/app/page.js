import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/lib/articles';
import { SITE, CATEGORIES } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const articles = await getArticles({ limit: 12 });
  const featured = articles.slice(0, 3);
  const rest = articles.slice(3, 9);

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="badge-ai">
            <span className="dot" /> Contenus optimisés en continu par notre agent IA
          </span>
          <h1>
            Réussir dans le numérique <em>en Afrique</em>, guide par guide.
          </h1>
          <p>
            {SITE.description}
          </p>
          <div className="pills">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/category/${c.id}`} className="pill">
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>À la une</h2>
            <Link href="/blog">Tous les guides →</Link>
          </div>
          <div className="grid">
            {featured.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
          {!articles.length && (
            <div className="empty">
              L’agent IA prépare les premiers articles… Revenez dans un instant.
            </div>
          )}
        </div>
      </section>

      {rest.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <h2>Derniers articles</h2>
            </div>
            <div className="grid">
              {rest.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="cat-hero">
            <h2 style={{ margin: '0 0 10px', color: '#fff', fontSize: '1.6rem' }}>
              Un site qui s’améliore 24h/24
            </h2>
            <p style={{ maxWidth: 640, color: '#cfe4db' }}>
              Notre agent IA open-source recherche les mots-clés recherchés en Afrique, rédige de
              nouveaux guides, met à jour les anciens articles et vérifie le SEO en continu —
              pendant que vous dormez.
            </p>
            <p style={{ marginTop: 18 }}>
              <Link href="/admin" className="btn">
                Ouvrir le tableau de bord
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
