import express, { Request, Response } from 'express';
import cors from 'cors';
import {
  createSession,
  getSession,
  getSessionByRoomName,
  deleteSession,
} from './session';
import { detectBounty } from './bountyDetector';
import { generateSummary } from './summary';
import {
  joinRoom,
  stopTranscription,
  getRizzResponse,
  sendGreeting,
  clearHistory,
} from './dailyBot';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

const PORT = process.env.PORT || 3001;

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// POST /start
app.post('/start', async (req: Request, res: Response) => {
  try {
    const { roomUrl } = req.body;
    if (!roomUrl || typeof roomUrl !== 'string') {
      return res.status(400).json({ error: 'roomUrl (string) is required' });
    }

    const cleanedUrl = roomUrl.replace(/\/$/, '');
    const roomId = cleanedUrl.split('/').pop()!;

    if (getSession(roomId)) {
      return res.json({ status: 'already_running', roomId });
    }

    const session = createSession(roomUrl);
    await joinRoom(roomUrl, session);

    // Optional greeting when a participant name is provided
    const participantName = req.body?.participantName || 'there';
    sendGreeting(roomId, participantName, (event, data) =>
      session.emit(event, data)
    );

    res.json({ status: 'started', roomId });
  } catch (err: any) {
    console.error('[POST /start] error:', err);
    res.status(500).json({ error: err.message || 'Failed to start session' });
  }
});

// GET /events/:roomId  (SSE)
app.get('/events/:roomId', (req: Request, res: Response) => {
  const roomIdParam = req.params.roomId;
  const roomId = Array.isArray(roomIdParam) ? roomIdParam[0] : roomIdParam;
  if (!roomId) {
    return res.status(400).json({ error: 'roomId is required' });
  }
  const session = getSession(roomId);

  if (!session) {
    return res.status(404).json({ error: 'No active session for this roomId' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no', // disable nginx buffering if present
  });

  res.write(': connected\n\n');

  session.addListener(res);

  // Clean up on client disconnect
  req.on('close', () => {
    session.removeListener(res);
  });
});

// POST /stop
app.post('/stop', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.body;
    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ error: 'roomId (string) is required' });
    }

    const session = getSession(roomId);
    if (!session) {
      return res.json({ status: 'not_found', roomId });
    }

    // Stop server-side transcription via Daily REST
    await stopTranscription(roomId);

    // Generate summary (also saves to Supabase)
    const summary = await generateSummary(session);

    // Notify any remaining SSE listeners
    session.emit('call_ended', summary);

    deleteSession(roomId);
    clearHistory(roomId);

    res.json({ status: 'stopped', roomId });
  } catch (err: any) {
    console.error('[POST /stop] error:', err);
    res.status(500).json({ error: err.message || 'Failed to stop session' });
  }
});

// POST /chat — for typed messages from the sidebar RizzPanel
app.post('/chat', async (req: Request, res: Response) => {
  const { roomId, message, speaker } = req.body
  if (!message) return res.status(400).json({ error: 'message required' })

  const response = await getRizzResponse(roomId || 'sidebar', message, speaker || 'User')
  if (response) {
    // Also emit to SSE if there's an active session
    const session = getSession(roomId)
    session?.emit('rizz_message', { text: response, timestamp: Date.now() })
    return res.json({ text: response })
  }
  return res.status(500).json({ error: 'no response' })
})

// POST /webhook/daily  — receives transcription events from Daily.co
app.post('/webhook/daily', (req: Request, res: Response) => {
  const event = req.body || {};

  // Only care about transcription messages for now
  if (event.type === 'transcription-message') {
    const { text, participantId, userName, roomName } = event;

    if (text && roomName) {
      const session = getSessionByRoomName(roomName) || getSession(roomName);

      if (session) {
        const speaker = userName || participantId || 'unknown';
        session.addLine(speaker, text);

        const bounty = detectBounty(text, speaker);
        if (bounty) {
          session.addBounty(bounty);
          session.emit('bounty_detected', bounty);
        }

        session.emit('transcript_line', { speaker, text });

        // Live Rizz response — only when explicitly addressed
        if (/rizz/i.test(text)) {
          getRizzResponse(session.roomId, text, speaker)
            .then((response) => {
              if (response) {
                session.emit('rizz_message', {
                  text: response,
                  timestamp: Date.now(),
                });
              }
            })
            .catch((err) => console.error('[rizz] LLM error:', err));
        }
      }
    }
  }

  // Always acknowledge quickly
  res.status(200).send('ok');
});

app.listen(PORT, () => {
  console.log(`Rizz intelligence server listening on port ${PORT}`);
  console.log(`RIZZ_SERVER_URL=${process.env.RIZZ_SERVER_URL || '(not set — webhook will fail)'}`);
});
