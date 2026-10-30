import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import crypto from 'crypto';
import { getSources, saveSources } from '@/lib/storage';
import { RSSFeedSource, Category } from '@/types';

const parser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 NeuralPulse/1.0',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
  }
});

export async function GET() {
  try {
    const sources = await getSources();
    return NextResponse.json({ sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sources = await getSources();

    // Toggle enabled action
    if (body.action === 'toggle') {
      const { id } = body;
      const index = sources.findIndex(s => s.id === id);
      if (index === -1) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      sources[index].enabled = !sources[index].enabled;
      await saveSources(sources);
      return NextResponse.json({ success: true, source: sources[index] });
    }

    // Add new source action
    if (body.action === 'add') {
      const { name, feedUrl, websiteUrl, category, color } = body;
      if (!name || !feedUrl) {
        return NextResponse.json({ error: 'Name and feedUrl are required' }, { status: 400 });
      }

      // Check for duplicate
      if (sources.some(s => s.feedUrl.toLowerCase() === feedUrl.toLowerCase())) {
        return NextResponse.json({ error: 'Source with this feed URL already exists' }, { status: 400 });
      }

      // Validate feed URL by attempting to parse it
      try {
        const feed = await parser.parseURL(feedUrl);
        const newSource: RSSFeedSource = {
          id: crypto.createHash('md5').update(feedUrl).digest('hex').slice(0, 10),
          name: name.trim(),
          feedUrl: feedUrl.trim(),
          websiteUrl: websiteUrl?.trim() || feed.link || feedUrl,
          category: (category as Category) || 'LLMs & GenAI',
          color: color || '#8b5cf6',
          enabled: true,
          articleCount: feed.items?.length || 0,
          lastSynced: new Date().toISOString(),
        };

        sources.push(newSource);
        await saveSources(sources);
        return NextResponse.json({ success: true, source: newSource });
      } catch (err: any) {
        return NextResponse.json({ error: `Could not parse RSS feed: ${err.message}` }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Source id is required' }, { status: 400 });
    }

    let sources = await getSources();
    sources = sources.filter(s => s.id !== id);
    await saveSources(sources);

    return NextResponse.json({ success: true, sources });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
