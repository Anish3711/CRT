import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let clientInstance: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[v0] Missing Supabase env vars:', { 
      url: supabaseUrl ? 'present' : 'MISSING', 
      key: supabaseAnonKey ? 'present' : 'MISSING' 
    })
    throw new Error('Missing Supabase environment variables')
  }
  
  console.log('[v0] Creating Supabase client with URL:', supabaseUrl.substring(0, 40) + '...')
  
  clientInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  
  return clientInstance
}
