import Link from 'next/link';
import { CATEGORIES } from '@/lib/site';

export const metadata = { title: 'Page introuvable' };

export default function NotFound() {
  return (
    <div className="container narrow" style={{ textAlign: 'center', padding: '80px 20px 40px' }}>
      <p style={{ fontSize: 'clamp(3.4rem, 12vw, 6rem)', fontWeight: 900, margin: 0, letterSpacing: -3, lineHeight: 1 }}>
        404
      </p>
      <h1 style={{ marginTop: 10 }}>Cette page n&apos;existe pas (ou plus)</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 520, margin: '10px auto 26px' }}>
        Le lien est peut-être incomplet, ou le contenu a été déplacé. Explorez nos guides les plus
        consultés ci-dessous.
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <Link href="/" className="btn">
          Retour à l&apos;accueil
        </Link>
        <Link href="/blog" className="btn ghost">
          Tous les guides
        </Link>
      </div>
      <div className="pills" style={{ justifyContent: 'center', marginTop: 28 }}>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`/category/${c.id}`} className="pill">
            <span className="swatch" style={{ background: c.accent }} />
            {c.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
