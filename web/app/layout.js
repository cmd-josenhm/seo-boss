import './globals.css';
import Header, { Footer } from '@/components/Layout';
import Analytics from '@/components/Analytics';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import JsonLd, { siteJsonLd } from '@/components/JsonLd';
import { SITE } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: SITE.keywords,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: { card: 'summary_large_image', site: SITE.twitter },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  ...(SITE.verification ? { verification: { google: SITE.verification } } : {}),
  icons: { icon: '/icon.svg' },
};

export const viewport = {
  themeColor: '#10231c',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang={SITE.lang}>
      <body>
        <JsonLd data={siteJsonLd(SITE.url)} />
        <Header />
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
