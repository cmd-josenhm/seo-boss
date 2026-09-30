import { NextResponse } from 'next/server';

const SUPA_URL = process.env.SUPABASE_URL || '';
const SUPA_KEY = process.env.SUPABASE_ANON_KEY || '';
const MAX_PATH = 200;

/** Beacon de suivi interne : alimente le compteur affiché dans /admin. */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = String(body?.path || '/').slice(0, MAX_PATH);
    if (SUPA_URL && SUPA_KEY) {
      const url = `${SUPA_URL}/rest/v1/page_views?on_conflict=path,day`;
      await fetch(url, {
        method: 'POST',
        headers: {
          apikey: SUPA_KEY,
          Authorization: `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify([{ path, day: new Date().toISOString().slice(0, 10), views: 1 }]),
      });
    }
  } catch {
    /* le suivi ne doit jamais casser la page */
  }
  return new NextResponse(null, { status: 204 });
}
