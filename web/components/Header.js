'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE, CATEGORIES, DEVIS_URL, DEVIS_LABEL } from '@/lib/site';

/** En-tête sticky avec navigation responsive (menu plein écran sur mobile). */
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // referme le menu à chaque changement de page
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" aria-label={`${SITE.name} — accueil`}>
          <span className="brand-mark" aria-hidden="true">B</span>
          <span className="brand-name">
            Buzz<span>Afrique</span>
          </span>
        </Link>

        <nav className="nav-desktop" aria-label="Navigation principale">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              className={`nav-link${isActive(`/category/${c.id}`) ? ' is-active' : ''}`}
            >
              {c.label}
            </Link>
          ))}
          <Link href="/blog" className={`nav-link${isActive('/blog') ? ' is-active' : ''}`}>
            Tous les guides
          </Link>
          <a
            className="btn btn-devis"
            href={DEVIS_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Besoin d'un site web ? Demandez un devis"
          >
            {DEVIS_LABEL}
          </a>
        </nav>

        <button
          className="burger"
          type="button"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>
      </div>

      <div id="menu-mobile" className={`mobile-panel${open ? ' open' : ''}`}>
        <Link href="/blog">Tous les guides</Link>
        {CATEGORIES.map((c) => (
          <Link key={c.id} href={`/category/${c.id}`}>
            {c.label}
          </Link>
        ))}
        <Link href="/a-propos">À propos</Link>
        <Link href="/contact">Contact</Link>
        <a className="btn btn-devis" href={DEVIS_URL} target="_blank" rel="noopener noreferrer">
          {DEVIS_LABEL} — créer mon site web
        </a>
      </div>
    </header>
  );
}
