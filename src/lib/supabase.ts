import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Lazy Supabase client creation to avoid build-time evaluation
let supabase: ReturnType<typeof createClient<Database>> | null = null

function getSupabaseClient(): ReturnType<typeof createClient<Database>> {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables — check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY')
    }

    supabase = createClient<Database>(supabaseUrl, supabaseKey)
  }

  return supabase
}

export { getSupabaseClient }