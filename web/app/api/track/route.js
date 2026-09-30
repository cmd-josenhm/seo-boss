import { NextResponse } from 'next/server';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');

/**
 * Beacon de suivi interne → base SQLite du backend (agent).
 * Alimente le compteur de fréquentation affiché dans /admin.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body?.path || '/').slice(0, 200);
    if (AGENT_URL) {
      await fetch(`${AGENT_URL}/views`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
        signal: AbortSignal.timeout(4000),
      });
    }
  } catch {
    /* le suivi ne doit jamais casser la page */
  }
  return new NextResponse(null, { status: 204 });
}
