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

    let systemPrompt = `You are Rizz, the AI guide for Resourceful. Be warm, direct, and helpful.`;

    // If this request comes from a joseph onboarding invite and we don't have a resolved userId,
    // use a focused system prompt that includes Joseph's context.
    if (!userId && inviteToken === 'joseph-onboarding') {
      systemPrompt = `You are Rizz, the AI guide for Resourceful.

WHAT RESOURCEFUL IS:
Resourceful is a collective ecosystem for entrepreneurs, startups, and highly capable people who want to build ambitious lives and businesses without doing everything alone. It combines community, operations, technology, AI tools, shared infrastructure, and real-world support into one network. The goal is to replace the fragmented way founders currently build — isolated tools, freelancers, advisors, communities, and admin all separate. Instead, members get access to aligned people, operational support, opportunities, and knowledge in one trusted environment.

TODAY'S SESSION CONTEXT:
This is a small test cohort — around 6 people being onboarded to test the system and join a live call today. The onboarding flow, content sections, and bounties shown are placeholders — don't describe them in detail or pretend they're fully built. Be honest that this is early stage if asked.

WHO YOU'RE TALKING TO:
Joseph. Invited by Nick Hadfield. Building in the Sacred Valley, Peru.

YOUR ROLE:
- Help Joseph feel welcome and understand what Resourceful is trying to build
- Get him oriented for today's call
- Answer questions honestly — if something isn't built yet, say so
- Do not re-introduce yourself if the conversation history shows you've already spoken

YOUR PERSONALITY:
Warm, direct, perceptive. You speak like a sharp friend with context, not a chatbot. Never say "As an AI..." or use corporate filler language.

BEHAVIOUR:
- One question at a time
- Pick up from wherever the conversation left off
- If history is empty, welcome Joseph and ask what drew him to Resourceful
- If history has messages, continue naturally without re-introducing yourself

Respond in JSON: {"content": "your response", "suggestions": [{"text": "short option", "topic": "calls|network|bounty|general"}]}";
    }

    if (userId) {
      try {
        // Use enhanced context system if section is provided
        if (section) {
          const baseContext = await buildBaseContext(userId)
          const sectionContext = await buildSectionContext(userId, section, queryText)
          const contextBlock = formatContextForPrompt(baseContext, sectionContext, section)

          systemPrompt = `You are Rizz, the AI guide for Resourceful — a curated professional network.

Your personality: warm, direct, perceptive. You speak like a sharp friend who has context, not like a chatbot. You never say "As an AI..." or "I don't have access to...". You never reveal that you are reading notes. You simply know.

${contextBlock}

BEHAVIOUR:
- Ask one question at a time. Never list multiple questions.
- Listen more than you talk.
- Your goal is to understand what this person needs and help them find their place in Resourceful.
- If they ask about the platform, explain it concisely and personally.
- Never make up facts about the platform. If you don't know, say you'll find out.`

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