import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Lazy Supabase client creation to avoid build-time evaluation
let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient(): ReturnType<typeof createClient> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY')
    }

    supabase = createClient(supabaseUrl, supabaseKey)
  }
  return supabase!
}

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
    const { data: platformInvite } = await getSupabaseClient()
      .from('platform_invites')
      .select('email')
      .eq('token', inviteToken)
      .maybeSingle() as { data: { email: string } | null }

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
      const { data: user } = await getSupabaseClient()
        .from('users')
        .select('id')
        .eq('email', inviteEmail)
        .maybeSingle() as { data: { id: string } | null }

      console.log('User lookup result:', { user })

      if (user) {
        userId = user.id
        console.log('Found user ID:', userId)
      } else {
        console.log('User not found, trying alternative lookup...')

        // Try looking up by name instead
        const { data: userByName } = await getSupabaseClient()
          .from('users')
          .select('id')
          .eq('name', 'Joseph Brand')
          .maybeSingle() as { data: { id: string } | null }

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
      role: h.role === 'user' ? 'user' : 'assistant',
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