import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Bypasses RLS. Only import this from route handlers / server actions, never client code.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)
