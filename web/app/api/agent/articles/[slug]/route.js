import { NextResponse } from 'next/server';

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';

/** Publier / dépublier un article via l'agent (dashboard /admin). */
export async function PATCH(req, { params }) {
  const token = req.headers.get('x-admin-token') || '';
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Jeton admin invalide' }, { status: 401 });
  }
  if (!AGENT_URL) return NextResponse.json({ error: 'Agent non configuré' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch(`${AGENT_URL}/articles/${encodeURIComponent(params.slug)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-agent-token': AGENT_TOKEN || 'dev-agent-token' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
