import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  ...(SITE.verification ? { verification: { google: SITE.verification } } : {}),
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f8f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1210' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang={SITE.lang}>
      <head>
        {/* Les balises SEO/OG sont aussi présentes en HTML brut pour les robots */}
        <link rel="alternate" type="application/rss+xml" title={`${SITE.name} — flux RSS`} href="/feed.xml" />
      </head>
      <body>
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <JsonLd data={siteJsonLd(SITE.url, SITE.name)} />
        <Header />
        <main id="contenu">{children}</main>
        <Footer />
        <Analytics />
        <VercelAnalytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
