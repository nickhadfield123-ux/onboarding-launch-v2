import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { roomUrl } = await request.json();

    if (!roomUrl) {
      return NextResponse.json({ error: 'roomUrl is required' }, { status: 400 });
    }

    // For now just acknowledge — real process termination / cleanup will be wired later
    console.log(`[rizz-bot/stop] Received stop request for room: ${roomUrl}`);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[rizz-bot/stop] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to stop Rizz bot' }, { status: 500 });
  }
}
