import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get('email');
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
  
  const { data, error } = await supabase
    .from('rizz_chat_history')
    .select('messages')
    .eq('email', email)
    .single();
  
  if (error) return Response.json({ messages: [] });
  return Response.json({ messages: data.messages });
}
