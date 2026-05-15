import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, messages } = await req.json();
  if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
  
  const filtered = messages.filter((m: {role: string, content: string}) => 
    !m.content.includes('[email verified]') &&
    !m.content.includes('magic link') &&
    !m.content.includes('email confirmation') &&
    !m.content.includes('What address should I use') &&
    !m.content.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) // filter out bare email addresses
  );

  const { error } = await supabase
    .from('rizz_chat_history')
    .upsert({ email, messages: filtered, updated_at: new Date().toISOString() }, 
             { onConflict: 'email' });
  
  if (error) return Response.json({ error }, { status: 500 });
  return Response.json({ success: true });
}
