import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { roomUrl } = await request.json();

    if (!roomUrl) {
      return Response.json({ error: 'roomUrl is required' }, { status: 400 });
    }

    // Resolve path to the Python bot (relative to project root)
    const botPath = path.resolve(process.cwd(), 'rizz-bot', 'bot.py');

    // Spawn the bot as a detached background process
    // Pass --room and let it inherit all environment variables (GROQ, SUPABASE, DAILY, MISTRAL, etc.)
    const child = spawn('python3', [botPath, '--room', roomUrl], {
      env: {
        ...process.env,
        // Explicitly ensure critical keys are present (Next.js sometimes strips some)
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        DAILY_API_KEY: process.env.DAILY_API_KEY,
        MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      },
      detached: true,
      stdio: 'ignore',
    });

    child.unref(); // Allow parent (Next.js) to exit without waiting for the long-running bot

    console.log(`[rizz-bot] Spawned bot for room ${roomUrl} (pid: ${child.pid})`);

    return Response.json({ ok: true, pid: child.pid });
  } catch (error: any) {
    console.error('[rizz-bot/start] Error spawning bot:', error);
    return Response.json(
      { error: error.message || 'Failed to start Rizz bot' },
      { status: 500 }
    );
  }
}
