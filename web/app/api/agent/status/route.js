import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');

/** Statut de l'agent + état de la configuration SEO du site (dashboard /admin). */
export async function GET() {
  const out = {
    site: {
      ga_connected: Boolean(process.env.NEXT_PUBLIC_GA_ID),
      ga_id: process.env.NEXT_PUBLIC_GA_ID || '',
      gsc_verified: Boolean(process.env.GOOGLE_SITE_VERIFICATION),
      vercel_analytics: true,
      database: 'backend intégré (SQLite)',
      agent_configured: Boolean(AGENT_URL),
      site_url: process.env.NEXT_PUBLIC_SITE_URL || '',
    },
    agent: null,
    error: null,
  };

  if (!AGENT_URL) {
    out.error = 'AGENT_BASE_URL non configuré — le site sert uniquement le catalogue sauvegardé.';
    return NextResponse.json(out);
  }

  try {
    const res = await fetch(`${AGENT_URL}/status`, {
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    out.agent = await res.json();
  } catch (e) {
    out.error = `Agent injoignable (${e.message}) — service Render en veille ou base en cours de démarrage.`;
  }
  return NextResponse.json(out);
}
