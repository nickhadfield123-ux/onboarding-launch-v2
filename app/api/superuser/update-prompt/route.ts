import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { key, content } = await request.json();

    if (!key || !content) {
      return NextResponse.json({ error: 'Missing key or content' }, { status: 400 });
    }

    // In a real app this would persist to DB or file
    console.log(`[Superuser] Saved prompt for key "${key}"`);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
