import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Bookmarks are persisted per-user in client localStorage (`src/lib/saved-storage.ts`).
 * Kept lightweight without importing static JSON datasets to minimize Worker bundle size.
 */
export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
