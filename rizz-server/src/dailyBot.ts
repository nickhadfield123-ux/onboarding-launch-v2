import { CallSession } from './session';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const RIZZ_SERVER_URL = process.env.RIZZ_SERVER_URL || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Per-room conversation history for live Rizz responses (max 6 turns)
const conversationHistory = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

const SYSTEM_PROMPT = `You are Rizz — the AI co-founder built into Resourceful, 
a platform for builders, creators and operators working 
on real projects.

Your personality: witty, clever, a bit cheeky, always 
concise. Never waffle. One or two sentences max unless 
someone asks for more. You have opinions and you're not 
afraid to use them — but you're here to help, not to 
show off.

Your job on calls:
1. When someone joins, greet them warmly but briefly. 
   One sentence. Use their name if you have it.
2. Listen to the conversation. If someone says "Rizz" 
   or addresses you directly, respond helpfully and 
   in character.
3. You know about the Resourceful platform: it's a 
   network of builders and operators, with calls, 
   bounties, and a membership layer. You help people 
   navigate it.
4. You do NOT speak unless greeted or addressed. 
   Do not interrupt.

Keep responses short. Be the smartest person in the 
room who also knows when to shut up.`;

async function createBotToken(roomUrl: string): Promise<string | undefined> {
  if (!DAILY_API_KEY) return undefined;

  const roomName = roomUrl.replace(/\/$/, '').split('/').pop()!;
  try {
    const resp = await fetch('https://api.daily.co/v1/meeting-tokens', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: 'Rizz',
          is_owner: true,
          auto_start_transcription: true,
          enable_transcription_webhook: true,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[dailyBot] createBotToken failed:', txt);
      return undefined;
    }

    const data = await resp.json();
    return data.token;
  } catch (e) {
    console.error('[dailyBot] createBotToken error:', e);
    return undefined;
  }
}

async function startTranscriptionWebhook(roomName: string): Promise<void> {
  if (!DAILY_API_KEY || !RIZZ_SERVER_URL) {
    console.warn(
      '[dailyBot] Missing DAILY_API_KEY or RIZZ_SERVER_URL — transcription webhook not started for',
      roomName
    );
    return;
  }

  const webhookUrl = `${RIZZ_SERVER_URL.replace(/\/$/, '')}/webhook/daily`;

  try {
    const resp = await fetch(
      `https://api.daily.co/v1/rooms/${roomName}/transcription`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: 'en',
          tier: 'nova-2',
          webhook_url: webhookUrl,
        }),
      }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      console.error('[dailyBot] startTranscription failed:', txt);
    } else {
      console.log('[dailyBot] Transcription webhook started for room:', roomName);
    }
  } catch (e) {
    console.error('[dailyBot] startTranscription error:', e);
  }
}

export async function stopTranscription(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) {
    console.warn('[dailyBot] No DAILY_API_KEY — cannot stop transcription');
    return;
  }

  try {
    const resp = await fetch(
      `https://api.daily.co/v1/rooms/${roomName}/transcription/stop`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      }
    );

    if (!resp.ok) {
      const txt = await resp.text();
      console.warn('[dailyBot] stopTranscription response:', txt);
    } else {
      console.log('[dailyBot] Transcription stopped for room:', roomName);
    }
  } catch (e) {
    console.error('[dailyBot] stopTranscription error:', e);
  }
}

export async function joinRoom(roomUrl: string, session: CallSession): Promise<void> {
  const roomName = session.roomId;

  // Create named token (Rizz will appear in participant list when used by a client;
  // we create it for consistency and future use even though we don't connect via SDK here)
  const token = await createBotToken(roomUrl);
  if (token) {
    console.log('[dailyBot] Bot token created for Rizz in room:', roomName);
  }

  // Activate server-side transcription + webhook delivery
  await startTranscriptionWebhook(roomName);

  console.log('[dailyBot] Rizz intelligence listening on room:', roomName);
}

// =====================================================
// Live Rizz Response Loop (Groq)
// =====================================================

export async function getRizzResponse(
  roomId: string,
  userMessage: string,
  speakerName: string
): Promise<string | null> {
  if (!GROQ_API_KEY) {
    console.warn('[dailyBot] GROQ_API_KEY not set — skipping Rizz response');
    return null;
  }

  // Get or create history for this room (max 6 entries)
  let history = conversationHistory.get(roomId) || [];
  if (history.length > 6) {
    history = history.slice(-6);
  }

  // Add the new user message
  history.push({
    role: 'user',
    content: `${speakerName}: ${userMessage}`,
  });

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history,
  ];

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 120,
        temperature: 0.8,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[dailyBot] Groq API error:', resp.status, errText);
      return null;
    }

    const data = await resp.json();
    const responseText = data.choices?.[0]?.message?.content?.trim();

    if (responseText) {
      // Add assistant response to history
      history.push({ role: 'assistant', content: responseText });
      conversationHistory.set(roomId, history);
      return responseText;
    }

    return null;
  } catch (err) {
    console.error('[dailyBot] getRizzResponse error:', err);
    return null;
  }
}

export function clearHistory(roomId: string): void {
  conversationHistory.delete(roomId);
}

export async function sendGreeting(
  roomId: string,
  participantName: string,
  emitFn: (event: string, data: unknown) => void
): Promise<void> {
  const greetingPrompt = `[${participantName} just joined the call]`;

  const response = await getRizzResponse(roomId, greetingPrompt, 'system');

  if (response) {
    emitFn('rizz_message', {
      text: response,
      timestamp: Date.now(),
    });
  }
}
