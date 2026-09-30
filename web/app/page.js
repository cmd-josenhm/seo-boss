import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getArticles } from '@/lib/articles';
import { SITE, CATEGORIES, DEVIS_URL } from '@/lib/site';

export const revalidate = 300;

export const metadata = {
  alternates: { canonical: '/' },
};

export default async function HomePage() {
  const articles = await getArticles({ limit: 24 });
  const featured = articles.slice(0, 3);
  const rest = articles.slice(3, 12);

  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="badge">
            <span className="dot" /> Guides pratiques pour l&apos;Afrique francophone
          </span>
          <h1>
            Réussir sa vie numérique et spirituelle <em>en Afrique</em>, guide par guide.
          </h1>
          <p className="lead">{SITE.description}</p>
          <div className="hero-actions">
            <Link href="/blog" className="btn">
              Explorer les guides
            </Link>
            <a href={DEVIS_URL} className="btn ghost" target="_blank" rel="noopener noreferrer">
              Besoin d&apos;un site web ? Devis gratuit
            </a>
          </div>

          <div className="pills" style={{ marginTop: 30 }}>
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/category/${c.id}`} className="pill">
                <span className="swatch" style={{ background: c.accent }} />
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">À la une</span>
                <h2>Les guides du moment</h2>
              </div>
              <Link href="/blog" className="more">
                Tous les guides →
              </Link>
            </div>
            <div className="grid wide">
              {featured.map((a) => (
                <ArticleCard key={a.slug} article={a} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Derniers ajouts</span>
                <h2>Fraîchement publiés</h2>
              </div>
            </div>
            <div className="grid">
              {rest.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!articles.length && (
        <section className="section">
          <div className="container">
            <div className="empty">
              Les premiers guides arrivent dans un instant — revenez dans quelques minutes.
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Explorer</span>
              <h2>Nos thématiques</h2>
            </div>
          </div>
          <div className="grid">
            {CATEGORIES.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.id}`}
                className="card"
                style={{ '--cat-accent': c.accent }}
              >
                <span className="cat">{c.label}</span>
                <h3 style={{ margin: 0 }}>{c.desc}</h3>
                <div className="meta">
                  <span style={{ color: 'var(--brand)', fontWeight: 800 }}>Voir les guides →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Un projet de site web ou d&apos;application ?</h2>
              <p>
                Création de sites vitrines, blogs et boutiques en ligne pensés pour l&apos;Afrique :
                rapides, responsives et optimisés pour Google. Demandez un devis gratuit.
              </p>
            </div>
            <a href={DEVIS_URL} className="btn" target="_blank" rel="noopener noreferrer">
              Demander un devis →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
