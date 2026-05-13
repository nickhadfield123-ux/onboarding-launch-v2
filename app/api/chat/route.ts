import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inviteToken = searchParams.get('invite_id')

    if (!inviteToken) {
      return NextResponse.json(
        { error: 'invite_id parameter required' },
        { status: 400 }
      )
    }

    // Resolve userId from invite token
    let userId: string | null = null
    let inviteEmail: string | null = null

    // Try platform_invites first (primary table) - look up by token
    const { data: platformInvite } = await supabase
      .from('platform_invites')
      .select('email')
      .eq('token', inviteToken)
      .single()

    if (platformInvite) {
      inviteEmail = platformInvite.email
    } else {
      // For demo purposes, handle joseph-onboarding directly
      if (inviteToken === 'joseph-onboarding') {
        inviteEmail = 'brandjoseph14@gmail.com'
      } else {
        return NextResponse.json(
          { error: 'Could not find invite with this token' },
          { status: 404 }
        )
      }
    }

    // Temporary: Also handle joe-2025 for backward compatibility
    if (inviteToken === 'joe-2025') {
      inviteEmail = 'brandjoseph14@gmail.com'
    }

    // Look up user by email
    if (inviteEmail) {
      console.log('Looking up user with email:', inviteEmail)
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .single()

      console.log('User lookup result:', { user, error: userError })

      if (user) {
        userId = user.id
        console.log('Found user ID:', userId)
      } else {
        console.log('User not found, trying alternative lookup...')

        // Try looking up by name instead
        const { data: userByName } = await supabase
          .from('users')
          .select('id')
          .eq('name', 'Joseph Brand')
          .single()

        if (userByName) {
          userId = userByName.id
          console.log('Found user by name:', userId)
        } else {
          // For demo purposes, use a mock user ID when user doesn't exist
          console.log('Using mock user ID for demo')
          userId = '00000000-0000-0000-0000-000000000002' // Joseph's user ID from seed
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Could not resolve user from invite token' },
        { status: 404 }
      )
    }

    // Get request body
    const body = await request.json()
    const { message, history = [], section, queryText } = body

    // Convert history format
    const messages = history.map((h: any) => ({
      role: h.role === 'you' ? 'user' : 'assistant',
      content: h.content,
    }))

    // Add current message
    if (message) {
      messages.push({ role: 'user', content: message })
    }

    // Forward to /api/ai/chat with enhanced parameters
    const aiChatResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        userId,
        section: section || 'general',
        queryText, // Pass for semantic search
        returnJson: true, // Enable JSON response format for suggestions
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!aiChatResponse.ok) {
      throw new Error(`AI chat API returned ${aiChatResponse.status}`)
    }

    const aiData = await aiChatResponse.json()

    // Return in format expected by onboardingv4.html
    return NextResponse.json({
      content: aiData.content,
      message: aiData.content, // Backward compatibility
      suggestions: aiData.suggestions || [],
    })

  } catch (error) {
    console.error('Chat proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}