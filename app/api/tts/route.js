import { NextResponse } from 'next/server';

export async function POST(request) {
  const { text } = await request.json();

  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'playai-tts',
      voice: 'Celeste-PlayAI',
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text().catch(() => 'Unknown error');
    return NextResponse.json(
      { error: 'Groq TTS request failed', details: errorText },
      { status: 502 }
    );
  }

  // Stream the MP3 audio back to the client
  return new NextResponse(groqResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  });
}
