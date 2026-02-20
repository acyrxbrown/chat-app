import { createClient } from '@supabase/supabase-js'

// Use optional env access and avoid throwing during module evaluation.
// This prevents build-time/prerender errors if env vars are missing,
// while still allowing the app to fail gracefully at runtime if used.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Log a warning instead of throwing so Next.js can still prerender/export
  console.warn(
    'Supabase env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
      'Auth and database features will not work until these are configured.'
  )
}

// We still create the client; in practice you MUST configure the env vars
// in development and production. If they are missing, Supabase will fail
// when you actually try to use the client.
export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? ''
)
