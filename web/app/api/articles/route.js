import { NextResponse } from 'next/server';
import { getArticles } from '@/lib/articles';

export const dynamic = 'force-dynamic';

/** Liste publique des articles (utile aux intégrations et au dashboard). */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
  const category = searchParams.get('category') || undefined;
  const articles = await getArticles({ limit, category });
  return NextResponse.json(articles);
}
