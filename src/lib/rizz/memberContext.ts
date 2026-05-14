import { getSupabaseClient } from '@/lib/supabase'

type UserRow = {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
  avatar_url: string | null
  metadata: Record<string, any> | null
}

type MemberContextRow = {
  user_id: string
  invited_by: string | null
  relationship_to_inviter: string | null
  why_invited: string | null
  nick_notes: string | null
  suggested_rizz_opener: string | null
}

export interface MemberContextData {
  userName: string
  invitedBy: string | null
  relationshipToInviter: string | null
  whyInvited: string | null
  nickNotes: string | null
  suggestedOpener: string | null
}

export async function getMemberContext(
  userId: string
): Promise<MemberContextData | null> {
  const userResult = await getSupabaseClient()
    .from('users')
    .select('name')
    .eq('id', userId)
    .maybeSingle()
  const user = userResult.data as { name: string } | null

  if (!user) return null

  const ctxResult = await getSupabaseClient()
    .from('member_context')
    .select('*')
    .eq('user_id', userId)
    .single()
  const ctx = ctxResult.data as MemberContextRow | null

  return {
    userName: user.name,
    invitedBy: ctx?.invited_by ?? null,
    relationshipToInviter: ctx?.relationship_to_inviter ?? null,
    whyInvited: ctx?.why_invited ?? null,
    nickNotes: ctx?.nick_notes ?? null,
    suggestedOpener: ctx?.suggested_rizz_opener ?? null,
  }
}

export function buildRizzSystemPrompt(
  ctx: MemberContextData,
  pageContext: string
): string {
  const contextBlock = ctx.nickNotes
    ? `
WHAT NICK HAS SHARED ABOUT THIS PERSON:
- Name: ${ctx.userName}
- Invited by: ${ctx.invitedBy ?? 'unknown'}
- Relationship: ${ctx.relationshipToInviter ?? 'not specified'}
- Why invited: ${ctx.whyInvited ?? 'not specified'}
- Nick's notes: ${ctx.nickNotes}
- Suggested opener: ${ctx.suggestedOpener ?? 'not specified'}
`
    : `You are speaking with ${ctx.userName}.`

  return `You are Rizz, the AI guide for Resourceful — a curated professional network.

Your personality: warm, direct, perceptive. You speak like a sharp friend who has context, not like a chatbot. You never say "As an AI..." or "I don't have access to...". You never reveal that you are reading notes. You simply know.

You are currently on: ${pageContext}

${contextBlock}

BEHAVIOUR:
- On first message, use the suggested opener if one exists. Make it feel natural, not scripted.
- Ask one question at a time. Never list multiple questions.
- Listen more than you talk.
- Your goal is to understand what this person needs and help them find their place in Resourceful.
- If they ask about the platform, explain it concisely and personally.
- Never make up facts about the platform. If you don't know, say you'll find out.`
}

export async function getMemberContextByEmail(
  email: string
): Promise<MemberContextData | null> {
  const userResult = await getSupabaseClient()
    .from('users')
    .select('id, name')
    .eq('email', email)
    .maybeSingle()
  const user = userResult.data as { id: string; name: string } | null

  if (!user) return null
  return getMemberContext(user.id)
}