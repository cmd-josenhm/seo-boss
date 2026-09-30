import { NextResponse } from 'next/server';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';

/** Déclenche un cycle de l'agent (réservé au dashboard /admin). */
export async function POST(req) {
  const token = req.headers.get('x-admin-token') || '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Jeton admin invalide' }, { status: 401 });
  }
  if (!AGENT_URL) {
    return NextResponse.json({ error: 'AGENT_BASE_URL non configuré' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 110000);
    const res = await fetch(`${AGENT_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-token': AGENT_TOKEN || 'dev-agent-token',
      },
      body: JSON.stringify({ mode: body.mode || 'full' }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: `Agent injoignable : ${e.message}` }, { status: 502 });
  }
}
