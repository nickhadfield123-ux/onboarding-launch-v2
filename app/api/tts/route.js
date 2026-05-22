// TTS API — Groq Orpheus TTS for Rizz's voice (English)
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    if (!GROQ_API_KEY) {
      console.error('[tts] GROQ_API_KEY not configured');
      return NextResponse.json({ error: 'TTS not configured' }, { status: 501 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'canopylabs/orpheus-v1-english',
        voice: 'hannah',  // Orpheus English voices: tara, leah, jess, leo, dan, mia, zac, zoe, hannah
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[tts] Groq TTS error (${response.status}): ${errorText}`);
      return NextResponse.json(
        { error: 'TTS generation failed', details: errorText },
        { status: response.status }
      );
    }

    // Return the audio blob directly
    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[tts] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}