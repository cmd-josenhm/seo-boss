import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');

/** Statut de l'agent + état de la configuration SEO du site (dashboard /admin). */
export async function GET() {
  const out = {
    site: {
      ga_connected: Boolean(process.env.NEXT_PUBLIC_GA_ID),
      ga_id: process.env.NEXT_PUBLIC_GA_ID || '',
      database: 'backend-intégré (SQLite)', // plus de Supabase
      agent_configured: Boolean(AGENT_URL),
      site_url: process.env.NEXT_PUBLIC_SITE_URL || '',
    },
    agent: null,
    error: null,
  };

  if (!AGENT_URL) {
    out.error = 'AGENT_BASE_URL non configuré — le site utilise le contenu seed/local.';
    return NextResponse.json(out);
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${AGENT_URL}/status`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    out.agent = await res.json();
  } catch {
    out.error = 'Agent injoignable (le service Render est peut-être en veille).';
  }
  return NextResponse.json(out);
}
