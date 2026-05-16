import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getMemberContext, buildRizzSystemPrompt } from '@/lib/rizz/memberContext'
import { buildBaseContext, buildSectionContext, formatContextForPrompt } from '@/lib/rizz/contextFetcher'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      messages = [],
      userId,
      section,
      queryText,
      pageContext = 'Resourceful platform',
      temperature = 0.7,
      max_tokens = 1024,
      returnJson = false,
    } = body

    // Build system prompt with enhanced context
    const { searchParams: urlSearchParams } = new URL(request.url);
    const inviteToken = urlSearchParams.get('invite_id');

    // Default system prompt
    let systemPrompt = `You are Rizz, the AI guide for Resourceful. Be warm, direct, and helpful.`;

    // Special-case joseph onboarding when no userId resolved
    if (!userId && inviteToken === 'joseph-onboarding') {
      systemPrompt = `You are Rizz, the AI guide for Resourceful.

TODAY'S GOAL: There is a live call happening today. Your only job is to get Joseph on that call. Everything else is secondary.

WHAT RESOURCEFUL IS: An early-stage collective ecosystem for ambitious founders and operators. The tech is mid-build - be honest about that if asked. Don't oversell it.

WHO YOU'RE TALKING TO: Joseph. Invited by Nick Hadfield. Building in the Sacred Valley, Peru.

WHAT TO DO:
When the last message in history is "[email verified]", the user has just clicked their magic link. 
Respond with a single message that:
1. Confirms they are verified (one short sentence)
2. References what they said BEFORE the auth flow started (look back through history for their first real message)
3. Picks up the conversation from there with one focused question or observation

Example: "You're all set. You mentioned wanting to join today's call - let's make sure you're ready for that. What time works for you?"

Never ask "what are you hoping to achieve" if they already told you something specific.
- Then direct him to join the call.
- If he has questions about Resourceful, answer briefly and honestly, then bring it back to the call.
- Do not re-introduce yourself if the history shows you've already spoken.
- One message at a time. No lists of questions.

Respond in JSON: {"content": "your response", "suggestions": [{"text": "Join the call", "topic": "calls"}, {"text": "Tell me more", "topic": "general"}]} `;
    }

    if (userId) {
      try {
        // Use enhanced context system if section is provided
        if (section) {
          const baseContext = await buildBaseContext(userId)
          const sectionContext = await buildSectionContext(userId, section, queryText)
          const contextBlock = formatContextForPrompt(baseContext, sectionContext, section)

          systemPrompt = `You are Rizz, the AI guide for Resourceful - a curated professional network.

Your personality: warm, direct, perceptive. You speak like a sharp friend who has context, not like a chatbot. You never say "As an AI..." or "I don't have access to...". You never reveal that you are reading notes. You simply know.

${contextBlock}

BEHAVIOUR:
- Ask one question at a time. Never list multiple questions.
- Listen more than you talk.
- Your goal is to understand what this person needs and help them find their place in Resourceful.
- If they ask about the platform, explain it concisely and personally.
- Never make up facts about the platform. If you don't know, say you will find out.`

          if (returnJson) {
            systemPrompt += `\n\nRespond in JSON format: {"content": "your response text", "suggestions": [{"text": "suggestion", "topic": "bounty|network|calls|general"}]}`
          }
        } else {
          // Fallback to simple member context
          const ctx = await getMemberContext(userId)
          if (ctx) {
            systemPrompt = buildRizzSystemPrompt(ctx, pageContext)
          }
        }
      } catch (e) {
        console.warn('Could not load enhanced context:', e)
        // Fallback to basic member context
        try {
          const ctx = await getMemberContext(userId)
          if (ctx) {
            systemPrompt = buildRizzSystemPrompt(ctx, pageContext)
          }
        } catch (e2) {
          console.warn('Could not load basic member context:', e2)
        }
      }
    }

    const fullMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: fullMessages,
      temperature,
      max_tokens,
    })

    const content = completion.choices[0]?.message?.content ?? ''

    // Handle JSON response format
    if (returnJson) {
      try {
        const parsed = JSON.parse(content)
        return NextResponse.json(parsed)
      } catch (e) {
        // If parsing fails, return as regular content
        return NextResponse.json({ content, suggestions: [] })
      }
    }

    return NextResponse.json({ content, model: 'groq' })
  } catch (error) {
    console.error('Rizz chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get response from Rizz' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Rizz chat API is live' })
}
