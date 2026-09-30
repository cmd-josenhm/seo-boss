import Link from 'next/link';
import { SITE, CATEGORIES, DEVIS_URL } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <span className="brand-mark" aria-hidden="true">B</span>
              BuzzAfrique
            </div>
            <p>{SITE.description}</p>
          </div>

          <div className="footer-col">
            <h4>Catégories</h4>
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/category/${c.id}`}>
                {c.label}
              </Link>
            ))}
          </div>

          <div className="footer-col">
            <h4>Le site</h4>
            <Link href="/blog">Tous les guides</Link>
            <Link href="/a-propos">À propos</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {SITE.name} — Tous droits réservés
          </span>
          <span className="devis-line">
            <a href={DEVIS_URL} target="_blank" rel="noopener noreferrer">
              Contactez-nous si vous avez besoin d&apos;un site web
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
