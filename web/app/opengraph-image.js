import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Image Open Graph par défaut (partages WhatsApp / Facebook / X). */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #06301f 0%, #0f7b5f 55%, #7c5cff 130%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            B
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>BuzzAfrique</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2, maxWidth: 980 }}>
            Réussir dans le numérique en Afrique, guide par guide.
          </div>
          <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.82)' }}>
            Religion · IA · Emploi · Business · Réseaux sociaux
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.72)' }}>
          {SITE.url.replace(/^https?:\/\//, '')}
        </div>
      </div>
    ),
    size
  );
}
