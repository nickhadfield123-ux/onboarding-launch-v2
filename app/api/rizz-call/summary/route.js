// RIZZ_CALL_SUMMARY — fetches call summaries from Supabase
// Requires:
//   NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
//   SUPABASE_SERVICE_KEY — Supabase service role key (bypasses RLS)
//   RIZZ_SERVER_URL — Render rizz-server URL (for personalised summaries)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const rizzUrl = process.env.RIZZ_SERVER_URL;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

// GET /api/rizz-call/summary?room=<roomId or partial room URL>
// Returns the latest summary for that room.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');

    if (!room) {
      return NextResponse.json({ error: 'room query param is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('call_summaries')
      .select('*')
      .ilike('call_url', `%${room}%`)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 = no rows returned by .single()
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      console.error('[rizz-call/summary] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('[rizz-call/summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/rizz-call/summary
// Body: { room: string, speakerName: string }
// Returns a personalised summary for the given speaker.
export async function POST(request) {
  try {
    const { room, speakerName } = await request.json();

    if (!room || !speakerName) {
      return NextResponse.json({ error: 'room and speakerName are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Fetch the latest summary for this room
    const { data, error } = await supabase
      .from('call_summaries')
      .select('*')
      .ilike('call_url', `%${room}%`)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
      console.error('[rizz-call/summary] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get personalised summary from Render server
    let personal = null;
    let bounties = null;
    let actionItems = null;

    if (rizzUrl && data.id) {
      try {
        const personalRes = await fetch(`${rizzUrl}/summary/personal?summaryId=${data.id}&speakerName=${encodeURIComponent(speakerName)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (personalRes.ok) {
          const personalData = await personalRes.json();
          personal = personalData.personal || personalData;
          bounties = personalData.bounties || data.bounties || null;
          actionItems = personalData.action_items || data.action_items || null;
        }
      } catch (e) {
        console.warn('[rizz-call/summary] Render personal summary unavailable, falling back:', e.message);
      }
    }

    // Fallback to summary-level bounties/action_items if Render didn't return them
    if (!bounties) bounties = data.bounties || null;
    if (!actionItems) actionItems = data.action_items || null;

    return NextResponse.json({ personal, bounties, action_items: actionItems });
  } catch (error) {
    console.error('[rizz-call/summary] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}