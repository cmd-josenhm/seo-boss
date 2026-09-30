import { ImageResponse } from 'next/og';
import { getArticle } from '@/lib/articles';
import { catLabel, catAccent, SITE } from '@/lib/site';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

/** Titre lisible même si le backend est injoignable (dérivé du slug). */
const prettify = (slug) => {
  const s = String(slug || '').replace(/-/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Image Open Graph propre à chaque article. */
export default async function Image({ params }) {
  let title = prettify(params?.slug);
  let category = 'religion';
  try {
    const article = await getArticle(params?.slug);
    if (article?.title) {
      title = article.title;
      category = article.category || category;
    }
  } catch {
    /* repli sur le slug */
  }
  if (title.length > 120) title = `${title.slice(0, 117).trim()}…`;

  const accent = catAccent(category);

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px',
          background: `linear-gradient(135deg, #06301f 0%, #0f2c3f 45%, ${accent} 135%)`,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              B
            </div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>BuzzAfrique</div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              background: 'rgba(255,255,255,0.18)',
              padding: '10px 20px',
              borderRadius: 999,
            }}
          >
            {catLabel(category)}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 62,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.78)' }}>
          {SITE.url.replace(/^https?:\/\//, '')}
        </div>
      </div>
    ),
    size
  );
}
