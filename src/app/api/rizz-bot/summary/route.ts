import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomUrl = searchParams.get('roomUrl');

  if (!roomUrl) {
    return Response.json({ error: 'roomUrl query parameter is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('call_summaries')
      .select('*')
      .eq('call_url', roomUrl)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return Response.json({ error: 'No summary found for this room' }, { status: 404 });
    }

    return Response.json(data);
  } catch (err: any) {
    console.error('[rizz-bot/summary GET] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { roomUrl, email } = await request.json();

    if (!roomUrl || !email) {
      return Response.json({ error: 'roomUrl and email are required' }, { status: 400 });
    }

    // 1. Fetch the latest summary for the room
    const { data: summary, error } = await supabase
      .from('call_summaries')
      .select('*')
      .eq('call_url', roomUrl)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !summary) {
      return Response.json({ error: 'No summary found for this room' }, { status: 404 });
    }

    // 2. Resolve the participant's display name from their email
    //    (Daily userName is often the email; per_person keys are usually the display names)
    let participantName = email;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('name, display_name, full_name')
      .eq('email', email)
      .single();

    if (profile) {
      participantName =
        profile.name ||
        profile.display_name ||
        profile.full_name ||
        email;
    }

    // 3. Extract the personalised section
    const personalSummary =
      summary.per_person?.[participantName] ||
      summary.per_person?.[email] ||
      null;

    return Response.json({
      roomUrl,
      email,
      participantName,
      personalSummary,
      fullSummary: summary,
    });
  } catch (err: any) {
    console.error('[rizz-bot/summary POST] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
