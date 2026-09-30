import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

/**
 * Télécharge la sauvegarde du catalogue (fichier seed prêt à committer).
 * Sécurisé : réservé au dashboard (/admin).
 */
export async function GET(req) {
  const token = req.headers.get('x-admin-token') || new URL(req.url).searchParams.get('token') || '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Jeton admin invalide' }, { status: 401 });
  }
  if (!AGENT_URL) return NextResponse.json({ error: 'Agent non configuré' }, { status: 503 });

  try {
    const res = await fetch(`${AGENT_URL}/export/seed.js`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Disposition': `attachment; filename="seed-${stamp}.js"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
