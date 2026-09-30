import Link from 'next/link';
import { SITE, CATEGORIES } from '@/lib/site';

export default function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          Buzz<span>Afrique</span>
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          {CATEGORIES.slice(0, 4).map((c) => (
            <Link key={c.id} href={`/category/${c.id}`}>
              {c.label}
            </Link>
          ))}
          <Link href="/blog">Guides</Link>
          <Link href="/admin" className="cta">
            Contrôle du site
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="logo">Buzz<span style={{ color: 'var(--gold)' }}>Afrique</span></div>
            <p style={{ maxWidth: 320 }}>
              {SITE.description}
            </p>
          </div>
          <div>
            <h4>Catégories</h4>
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/category/${c.id}`}>{c.label}</Link>
            ))}
          </div>
          <div>
            <h4>Le site</h4>
            <Link href="/blog">Tous les guides</Link>
            <Link href="/a-propos">À propos</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/admin">Espace admin</Link>
          </div>
          <div>
            <h4>Suivre</h4>
            <Link href="/feed.xml">Flux RSS</Link>
            <Link href="/sitemap.xml">Plan du site</Link>
            <a href="https://twitter.com/" target="_blank" rel="noopener">X / Twitter</a>
            <a href="https://www.facebook.com/" target="_blank" rel="noopener">Facebook</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} {SITE.name} — Tous droits réservés</span>
          <span>Contenus produits &amp; optimisés en continu par notre agent IA open-source</span>
        </div>
      </div>
    </footer>
  );
}
