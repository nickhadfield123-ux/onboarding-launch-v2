import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { roomUrl, participantName } = await req.json();
  const rizzUrl = process.env.RIZZ_SERVER_URL;

  if (!rizzUrl) return Response.json({ status: 'unavailable' });

  try {
    const res = await fetch(`${rizzUrl}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomUrl, participantName }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ status: 'unavailable' });
  }
}
