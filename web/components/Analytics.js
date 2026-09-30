'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Google Analytics 4 + suivi interne (beacon /api/track pour /admin).
 * La balise GA4 est rendue côté serveur dans le HTML (fiable sans hydration)
 * et chaque navigation SPA envoie un hit de vue de page.
 */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
  const pathname = usePathname();
  const firstView = useRef(true);

  useEffect(() => {
    const url = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname;
    // beacon interne (compteur affiché dans /admin) — best-effort, ne casse jamais la page
    try {
      navigator.sendBeacon?.('/api/track', JSON.stringify({ path: url }));
    } catch { /* ignore */ }
    // GA4 : 1er hit envoyé par le config inline côté serveur, les suivants ici
    if (gaId && typeof window.gtag === 'function') {
      if (firstView.current) {
        firstView.current = false;
      } else {
        window.gtag('config', gaId, { page_path: url });
      }
    }
  }, [pathname, gaId]);

  if (!gaId) return null;
  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
        }}
      />
    </>
  );
}
