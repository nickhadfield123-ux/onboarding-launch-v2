// RIZZ_CALL_START — proxies to the Render rizz-server /start endpoint
// Requires RIZZ_SERVER_URL env var (the Render URL, e.g. https://rizz-server.onrender.com)

import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { roomUrl } = await request.json();

    if (!roomUrl) {
      return NextResponse.json({ error: 'roomUrl is required' }, { status: 400 });
    }

    const rizzUrl = process.env.RIZZ_SERVER_URL;
    if (!rizzUrl) {
      console.error('[rizz-call/start] RIZZ_SERVER_URL not configured');
      return NextResponse.json({ status: 'unavailable' }, { status: 200 });
    }

    const response = await fetch(`${rizzUrl}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[rizz-call/start] Render error (${response.status}): ${errorText}`);
      return NextResponse.json({ status: 'unavailable' }, { status: 200 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[rizz-call/start] Render not reachable:', error.message);
    return NextResponse.json({ status: 'unavailable' }, { status: 200 });
  }
}