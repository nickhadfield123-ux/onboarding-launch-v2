import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, messages } = await req.json();
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
  
  const { error } = await supabase
    .from('rizz_chat_history')
    .upsert({ email, messages, updated_at: new Date().toISOString() }, 
             { onConflict: 'email' });
  
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ success: true });
}
