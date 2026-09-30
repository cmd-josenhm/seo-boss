import { NextResponse } from 'next/server';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

/** Aperçu du mining de mots-clés (stratégie SEO). */
export async function GET(req) {
  const token = req.headers.get('x-admin-token') || '';
  if (ADMIN_TOKEN && token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Jeton admin invalide' }, { status: 401 });
  }
  if (!AGENT_URL) return NextResponse.json({ error: 'Agent non configuré' }, { status: 503 });
  try {
    const res = await fetch(`${AGENT_URL}/keywords/preview`, {
      headers: { 'x-agent-token': process.env.AGENT_TOKEN || 'dev-agent-token' },
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => []);
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
