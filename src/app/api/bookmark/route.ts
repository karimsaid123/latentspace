import { NextRequest, NextResponse } from 'next/server';
import { toggleArticleBookmark } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
    }

    const isBookmarked = await toggleArticleBookmark(id);
    return NextResponse.json({ success: true, bookmarked: isBookmarked });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
