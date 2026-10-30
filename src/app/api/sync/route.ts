import { NextResponse } from 'next/server';
import { syncFeeds } from '@/lib/rss-fetcher';

export async function POST() {
  try {
    const result = await syncFeeds();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error during sync:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
