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

WHO YOU'RE TALKING TO: Joseph. Invited by Nick Hadfield.

RULES:
- When the last message in history is "[email verified]", respond with a short confirmation and one focused question.
- Never ask "what are you hoping to achieve".
- One message at a time. No lists.

Respond in JSON: {"content": "your response", "suggestions": []}`;
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
