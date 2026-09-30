import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Icône Apple / favicon riche, générée à la compilation (PNG réel). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f7b5f 0%, #12b886 55%, #7c5cff 130%)',
          color: '#ffffff',
          fontSize: 104,
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: -4,
        }}
      >
        B
      </div>
    ),
    size
  );
}
