import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key);
}

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get('email');
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rizz_chat_history')
    .select('messages')
    .eq('email', email)
    .single();
  
  if (error) return Response.json({ messages: [] });
  return Response.json({ messages: data.messages });
}
