import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const AGENT_URL = (process.env.AGENT_BASE_URL || '').replace(/\/$/, '');
const AGENT_TOKEN = process.env.AGENT_TOKEN || '';
const SECRET = process.env.CRON_SECRET || process.env.ADMIN_TOKEN || '';

/**
 * Déclencheur de cycle pour ordonnanceur externe (Vercel Cron, cron-job.org,
 * UptimeRobot…). Réveille l'agent endormi ET lance un cycle de production.
 *
 * Sécurité : en-tête `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron l'envoie automatiquement) ou `?token=`.
 */
function authorized(req) {
  if (!SECRET) return false;
  const header = req.headers.get('authorization') || '';
  const bearer = header.replace(/^Bearer\s+/i, '');
  const qs = new URL(req.url).searchParams.get('token') || '';
  return bearer === SECRET || qs === SECRET;
}

async function trigger(req) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'non autorisé' }, { status: 401 });
  }
  if (!AGENT_URL) {
    return NextResponse.json({ error: 'AGENT_BASE_URL non configuré' }, { status: 503 });
  }
  try {
    const res = await fetch(`${AGENT_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-token': AGENT_TOKEN || 'dev-agent-token' },
      body: JSON.stringify({ mode: 'full' }),
      signal: AbortSignal.timeout(55000),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ triggered: res.ok, ...data }, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ error: `agent injoignable : ${e.message}` }, { status: 502 });
  }
}

export async function GET(req) {
  return trigger(req);
}

export async function POST(req) {
  return trigger(req);
}
