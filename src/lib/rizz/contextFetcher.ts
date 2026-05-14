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

export interface BaseContextData {
  platformInvites: any
  memberContext: any
  userProfile: any
  globalKB: any[]
  alwaysIncludeItems: any[]
}

export interface SectionContextData {
  sectionData: any[]
  sectionPins: any[]
  sectionKB: any[]
  semanticMatches?: any[]
}

export async function buildBaseContext(userId: string): Promise<string> {
  try {
    // Fetch platform_invites record for user (primary table with rizz_context, possibility, role_type)
    const { data: platformInvites } = await getSupabaseClient()
      .from('platform_invites')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Fall back to invites table if no platform_invites found
    let invitesData = platformInvites
    if (!invitesData) {
      const { data: invites } = await getSupabaseClient()
        .from('invites')
        .select('*')
        .eq('user_id', userId)
        .single()
      invitesData = invites
    }

    // Fetch member_context for user
    const { data: memberContext } = await getSupabaseClient()
      .from('member_context')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Fetch user_profiles for user
    const { data: userProfile } = await getSupabaseClient()
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Fetch content_items WHERE always_include=true
    const { data: alwaysIncludeItems } = await getSupabaseClient()
      .from('content_items')
      .select('*')
      .eq('always_include', true)

    // Fetch hub_kb WHERE section='global' AND always_load=true
    const { data: globalKB } = await getSupabaseClient()
      .from('hub_kb')
      .select('*')
      .eq('section', 'global')
      .eq('always_load', true)
      .order('priority', { ascending: false })

    // Format context block
    const contextParts = []

    if (invitesData) {
      contextParts.push(`PLATFORM INVITE: ${JSON.stringify(invitesData)}`)
    }

    if (memberContext) {
      contextParts.push(`MEMBER CONTEXT: ${JSON.stringify(memberContext)}`)
    }

    if (userProfile) {
      contextParts.push(`USER PROFILE: ${JSON.stringify(userProfile)}`)
    }

    if (alwaysIncludeItems && alwaysIncludeItems.length > 0) {
      contextParts.push(`ALWAYS INCLUDE CONTENT: ${JSON.stringify(alwaysIncludeItems)}`)
    }

    if (globalKB && globalKB.length > 0) {
      contextParts.push(`GLOBAL KNOWLEDGE BASE: ${JSON.stringify(globalKB)}`)
    }

    return contextParts.join('\n\n')
  } catch (error) {
    console.error('Error building base context:', error)
    return ''
  }
}

export async function buildSectionContext(userId: string, sectionName: string, queryText?: string): Promise<string> {
  try {
    const contextParts = []

    // Fetch section-specific data based on section_name
    let sectionData: any[] = []

    switch (sectionName) {
      case 'calls':
        // meetings (upcoming, not deleted), user_schedule for this user
        const { data: meetings } = await getSupabaseClient()
          .from('meetings')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .neq('deleted', true)
          .order('start_time', { ascending: true })
          .limit(10)

        const { data: userSchedule } = await getSupabaseClient()
          .from('user_schedule')
          .select('*')
          .eq('user_id', userId)

        sectionData = [...(meetings || []), ...(userSchedule || [])]
        break

      case 'bounties':
        // bounty_board (status='open'), network_skill_matches for this user
        const { data: bounties } = await getSupabaseClient()
          .from('bounty_board')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(20)

        const { data: skillMatches } = await getSupabaseClient()
          .from('network_skill_matches')
          .select('*')
          .eq('user_id', userId)

        sectionData = [...(bounties || []), ...(skillMatches || [])]
        break

      case 'network':
        // user_profiles (active, not self), member_offerings for this user
        const { data: networkProfiles } = await getSupabaseClient()
          .from('user_profiles')
          .select('*')
          .neq('user_id', userId)
          .neq('activation_status', 'invited')
          .order('last_active', { ascending: false })
          .limit(50)

        const { data: memberOfferings } = await getSupabaseClient()
          .from('member_offerings')
          .select('*')
          .eq('user_id', userId)

        sectionData = [...(networkProfiles || []), ...(memberOfferings || [])]
        break

      case 'watch':
        // content_items (category='video' OR content_type='loom')
        const { data: watchContent } = await getSupabaseClient()
          .from('content_items')
          .select('*')
          .or('category.eq.video,content_type.eq.loom')
          .order('created_at', { ascending: false })
          .limit(20)

        sectionData = watchContent || []
        break

      case 'myrizz':
        // conversations (user_id), cockpit_feed for this user
        const { data: conversations } = await getSupabaseClient()
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(10)

        const { data: cockpitFeed } = await getSupabaseClient()
          .from('cockpit_feed')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        sectionData = [...(conversations || []), ...(cockpitFeed || [])]
        break

      default:
        sectionData = []
    }

    if (sectionData.length > 0) {
      contextParts.push(`SECTION DATA (${sectionName.toUpperCase()}): ${JSON.stringify(sectionData)}`)
    }

    // Fetch section_pins WHERE section=section_name AND active=true
    const { data: sectionPins } = await getSupabaseClient()
      .from('section_pins')
      .select('*')
      .eq('section', sectionName)
      .eq('active', true)
      .order('priority', { ascending: false })

    if (sectionPins && sectionPins.length > 0) {
      contextParts.push(`SECTION PINS: ${JSON.stringify(sectionPins)}`)
    }

    // Fetch hub_kb WHERE section=section_name AND always_load=true
    const { data: sectionKB } = await getSupabaseClient()
      .from('hub_kb')
      .select('*')
      .eq('section', sectionName)
      .eq('always_load', true)
      .order('priority', { ascending: false })

    if (sectionKB && sectionKB.length > 0) {
      contextParts.push(`SECTION KNOWLEDGE BASE: ${JSON.stringify(sectionKB)}`)
    }

    // Semantic search if query provided
    if (queryText && queryText.trim().length > 10) { // Only search for substantial queries
      try {
        const semanticMatches = await performSemanticSearch(queryText, sectionName)
        if (semanticMatches && semanticMatches.length > 0) {
          contextParts.push(`SEMANTIC MATCHES (highly relevant to "${queryText}"): ${JSON.stringify(semanticMatches)}`)
        }
      } catch (error) {
        console.warn('Semantic search failed:', error)
      }
    }

    return contextParts.join('\n\n')
  } catch (error) {
    console.error('Error building section context:', error)
    return ''
  }
}

async function performSemanticSearch(queryText: string, sectionName: string): Promise<any[]> {
  try {
    // Generate embedding for query text using Gemini
    // Note: This assumes the same embedding model used for the existing 768-dim vectors
    // You may need to adjust the API call based on your actual embedding setup

    const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text: queryText }] }
      })
    })

    if (!embeddingResponse.ok) {
      console.warn('Failed to generate embedding for semantic search')
      return []
    }

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.embedding?.values

    if (!queryEmbedding || queryEmbedding.length !== 768) {
      console.warn('Invalid embedding dimensions for semantic search')
      return []
    }

    // Call Supabase RPC function
    const { data: matches, error } = await (getSupabaseClient() as any).rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: 5,
      filter_table: null // Search across all tables
    })

    if (error) {
      console.warn('Semantic search RPC error:', error)
      return []
    }

    // Fetch full records for matched items
    const results = []
    for (const match of matches || []) {
      try {
        const { data: fullRecord } = await getSupabaseClient()
          .from(match.source_table)
          .select('*')
          .eq('id', match.source_id)
          .single()

        if (fullRecord) {
          results.push({
            table: match.source_table,
            id: match.source_id,
            similarity: match.similarity,
            data: fullRecord,
            text_snapshot: match.text_snapshot
          })
        }
      } catch (e) {
        console.warn(`Failed to fetch ${match.source_table}:${match.source_id}`, e)
      }
    }

    return results
  } catch (error) {
    console.error('Semantic search failed:', error)
    return []
  }
}

export function formatContextForPrompt(baseContext: string, sectionContext: string, sectionName: string): string {
  const parts = []

  if (baseContext) {
    parts.push(`--- RESOURCEFUL PLATFORM CONTEXT ---\n${baseContext}`)
  }

  if (sectionContext) {
    parts.push(`--- CURRENT SECTION: ${sectionName.toUpperCase()} ---\n${sectionContext}`)
  }

  parts.push('---')

  return parts.join('\n\n')
}