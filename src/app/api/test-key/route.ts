import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { isLocalPersistentDev } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  // Block unauthenticated runtime env mutation in production / public deployments
  if (!isLocalPersistentDev()) {
    return NextResponse.json(
      { success: false, message: 'Runtime key configuration is restricted to local development.' },
      { status: 403 }
    );
  }

  try {
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ success: false, message: 'API key is required' }, { status: 400 });
    }

    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with the word "OK" only.' }] }],
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!testResponse.ok) {
      const err = await testResponse.text();
      return NextResponse.json(
        {
          success: false,
          message: `Gemini API error (${testResponse.status}): ${err}`,
        },
        { status: 400 }
      );
    }

    process.env.GEMINI_API_KEY = apiKey.trim();

    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf8');
      } catch {
        envContent = '';
      }

      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${apiKey.trim()}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${apiKey.trim()}\n`;
      }

      await fs.writeFile(envPath, envContent.trim() + '\n', 'utf8');
    } catch (e) {
      console.warn('Could not write to .env.local:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Gemini API key is valid and connected!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function GET() {
  const hasKey = typeof process !== 'undefined' && !!process.env?.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5;
  return NextResponse.json({
    configured: hasKey,
    mode: hasKey ? 'gemini' : 'heuristic',
  });
}
