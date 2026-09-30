'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Google Analytics 4 + suivi interne (beacon /api/track pour le dashboard). */
export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
  const pathname = usePathname();

  useEffect(() => {
    const url = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname;
    // beacon interne (compteur affiché dans /admin) — best-effort, ne casse jamais la page
    try {
      navigator.sendBeacon?.('/api/track', JSON.stringify({ path: url }));
    } catch { /* ignore */ }
    // GA4
    if (gaId && typeof window.gtag === 'function') {
      window.gtag('config', gaId, { page_path: url });
    }
  }, [pathname, gaId]);

  if (!gaId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
      </Script>
    </>
  );
}
