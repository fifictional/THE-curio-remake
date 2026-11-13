import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

function extractMeta(html: string, attr: 'property' | 'name', key: string): string | null {
  const regex = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  const m = regex.exec(html);
  return m?.[1] || null;
}

function extractLinkIcon(html: string): string | null {
  const regex = /<link[^>]+rel=["'][^"']*(icon|shortcut icon)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i;
  const m = regex.exec(html);
  return m?.[2] || null;
}

async function handle(urlParam: string | null) {
  if (!urlParam) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  try {
    const target = new URL(urlParam);
    const res = await fetch(target.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CurioBot/1.0)' },
      redirect: 'follow',
    });
    const html = await res.text();
    // prefer og:image, then twitter:image, then icon
    const ogImage = extractMeta(html, 'property', 'og:image');
    const twImage = extractMeta(html, 'name', 'twitter:image');
    const icon = extractLinkIcon(html);
    const img = ogImage || twImage || icon || null;
    const imageUrl = img ? new URL(img, target).toString() : null;
    return NextResponse.json({ imageUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch preview' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  return handle(url);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = body?.url as string | undefined;
  return handle(url || null);
}


