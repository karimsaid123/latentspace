import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/core/container';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await container.bootstrap();
    const sources = await container.sourceRepo.listAll();
    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await container.bootstrap();
    const body = await request.json();

    if (body.action === 'toggle' && body.id) {
      const source = await container.sourceRepo.findById(body.id);
      if (!source) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      await container.sourceRepo.toggleSource(body.id, !source.enabled);
      return NextResponse.json({ success: true, enabled: !source.enabled });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
