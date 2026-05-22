import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';
import { createClient } from '@supabase/supabase-js';
import { CallSession, BountyItem } from './session';

export interface SummaryResult {
  call_url: string;
  room_id: string;
  duration_mins: number;
  participants: string[];
  global_summary: string;
  per_person: Record<string, string>;
  bounties: BountyItem[];
  action_items: Array<{ action: string; owner: string | null }>;
  raw_transcript: any[];
  generated_at: string;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabase;
}

async function callLLM(prompt: string, maxTokens = 400): Promise<string> {
  // Try Groq first
  if (GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: GROQ_API_KEY });
      const resp = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
      });
      return resp.choices[0]?.message?.content || '';
    } catch (groqErr) {
      console.warn('[summary] Groq failed, trying Mistral...', (groqErr as Error).message);
      // fall through to Mistral
    }
  }

  // Fallback to Mistral
  if (MISTRAL_API_KEY) {
    try {
      const mistral = new Mistral({ apiKey: MISTRAL_API_KEY });
      const resp = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: prompt }],
        maxTokens,
      });
      // @ts-ignore - mistral response shape
      return resp.choices?.[0]?.message?.content || '';
    } catch (mistralErr) {
      console.error('[summary] Mistral also failed:', (mistralErr as Error).message);
      throw mistralErr;
    }
  }

  throw new Error('No LLM API key configured (GROQ_API_KEY or MISTRAL_API_KEY)');
}

export async function generateSummary(session: CallSession): Promise<SummaryResult> {
  if (!session.transcript.length) {
    throw new Error('No transcript available for summary');
  }

  const transcriptText = session.transcript
    .map((l) => `[${l.speaker}]: ${l.text}`)
    .join('\n');

  const durationMins = Math.round(
    (Date.now() - session.startedAt.getTime()) / 60000
  );

  const uniqueSpeakers = Array.from(
    new Set(session.transcript.map((l) => l.speaker))
  );

  // 1. Global summary
  const globalPrompt = `You are summarising a Resourceful community call.

TRANSCRIPT:
${transcriptText}

Write a concise summary (150-200 words) covering:
1. Main topics discussed
2. Key decisions or outcomes
3. Bounties mentioned (claimed or open)
4. Notable connections or introductions made

Be specific. Use names. Plain prose, no bullet points.`;

  const globalSummary = await callLLM(globalPrompt, 400);

  // 2. Per-person summaries (no profile data)
  const perPerson: Record<string, string> = {};
  for (const speaker of uniqueSpeakers) {
    const personalPrompt = `You are writing a personalised call summary for ${speaker}.

FULL CALL TRANSCRIPT:
${transcriptText}

Write a 100-word summary specifically for ${speaker}, filtered to what's most relevant for them.
Mention:
- What was discussed that relates to their work or comments
- Any bounties relevant to their skills or offers
- People they should follow up with and why
- Any action items for them specifically

Be direct and personal. Use "you" where appropriate.`;

    perPerson[speaker] = await callLLM(personalPrompt, 250);
  }

  // 3. Extra bounties from LLM (merge with live detected)
  const bountyPrompt = `From this call transcript, extract all bounties — tasks that were offered or requested.

TRANSCRIPT:
${transcriptText}

Return a JSON array only. Each item must have: {"text": string, "speaker": string, "claimer": string|null, "claimed": boolean, "ts": string|null}
Return ONLY valid JSON array, nothing else.`;

  let llmBounties: any[] = [];
  try {
    const raw = await callLLM(bountyPrompt, 500);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      llmBounties = parsed;
    }
  } catch {
    llmBounties = [];
  }

  const allBounties = [...session.bounties];
  for (const b of llmBounties) {
    if (
      b.text &&
      !allBounties.some((ab) => ab.text.toLowerCase() === String(b.text).toLowerCase())
    ) {
      allBounties.push({
        text: String(b.text),
        speaker: String(b.speaker || 'unknown'),
        claimer: b.claimer || null,
        claimed: !!b.claimed,
        ts: b.ts || new Date().toISOString(),
      });
    }
  }

  // 4. Action items
  const actionPrompt = `From this call transcript, list specific action items with owners.

TRANSCRIPT:
${transcriptText}

Return a JSON array only. Each item: {"action": string, "owner": string|null}
Return ONLY valid JSON array, nothing else.`;

  let actionItems: Array<{ action: string; owner: string | null }> = [];
  try {
    const raw = await callLLM(actionPrompt, 400);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      actionItems = parsed.map((a: any) => ({
        action: String(a.action || ''),
        owner: a.owner || null,
      }));
    }
  } catch {
    actionItems = [];
  }

  const result: SummaryResult = {
    call_url: session.roomUrl,
    room_id: session.roomId,
    duration_mins: durationMins,
    participants: uniqueSpeakers,
    global_summary: globalSummary,
    per_person: perPerson,
    bounties: allBounties,
    action_items: actionItems,
    raw_transcript: session.transcript,
    generated_at: new Date().toISOString(),
  };

  // Save to Supabase if configured
  const db = getSupabase();
  if (db) {
    try {
      const { error } = await db.from('call_summaries').insert({
        call_url: result.call_url,
        room_id: result.room_id,
        duration_mins: result.duration_mins,
        participants: result.participants,
        global_summary: result.global_summary,
        per_person: result.per_person,
        bounties: result.bounties,
        action_items: result.action_items,
        raw_transcript: result.raw_transcript,
        generated_at: result.generated_at,
      } as any);
      if (error) {
        console.error('[summary] Supabase insert error:', error);
      } else {
        console.log('[summary] Saved to call_summaries for', result.room_id);
      }
    } catch (e) {
      console.error('[summary] Supabase save failed:', e);
    }
  } else {
    console.warn('[summary] Supabase not configured — summary not persisted');
  }

  return result;
}
