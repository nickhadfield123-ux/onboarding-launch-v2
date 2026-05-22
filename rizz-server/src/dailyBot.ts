import { CallSession } from './session';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const RIZZ_SERVER_URL = process.env.RIZZ_SERVER_URL || '';

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
