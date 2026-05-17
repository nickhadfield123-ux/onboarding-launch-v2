import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') || searchParams.get('invite_id');

  if (!token) {
    return NextResponse.json({ error: 'Token or invite_id required' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  const { data: invite, error: inviteError } = await supabase
    .from('platform_invites')
    .select('name, rizz_context')
    .eq('token', token)
    .single();

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  return NextResponse.json({
    name: invite.name,
    rizzContext: invite.rizz_context
  });
}
