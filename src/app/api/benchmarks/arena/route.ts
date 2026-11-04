import { NextResponse } from 'next/server';
import { getLmsysArenaLeaderboard } from '@/lib/lmarena-client';

export const runtime = 'edge';
export const revalidate = 21600; // 6 hours

export async function GET() {
  try {
    const leaderboard = await getLmsysArenaLeaderboard();
    return NextResponse.json(
      {
        source: 'LMSYS Chatbot Arena',
        url: 'https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset',
        updatedAt: new Date().toISOString(),
        count: leaderboard.length,
        models: leaderboard
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400'
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch LMSYS Chatbot Arena leaderboard' },
      { status: 500 }
    );
  }
}
