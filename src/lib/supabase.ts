import { createClient } from '@supabase/supabase-js'

// Lazy Supabase client creation to avoid build-time evaluation
let supabase: ReturnType<typeof createClient> | null = null

function getSupabaseClient(): ReturnType<typeof createClient> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    supabase = createClient(supabaseUrl, supabaseKey)
  }

  return supabase
}

export { getSupabaseClient }