import 'server-only'
import { headers } from 'next/headers'
import { createClient as createStatelessClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { SecurityEventType } from '@/lib/security-checks'

export const MAX_FAILURES = 5 // wrong passwords / codes allowed per 15 minutes

async function clientInfo() {
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || null
  const ua = (h.get('user-agent') ?? '').slice(0, 200) || null
  return { ip: ip ? ip.slice(0, 64) : null, ua }
}

// Written with the service role only, so a stolen session cannot forge or erase the trail
export async function logSecurityEvent(userId: string, type: SecurityEventType) {
  const { ip, ua } = await clientInfo()
  const { error } = await supabaseAdmin
    .from('security_events')
    .insert({ user_id: userId, type, ip, user_agent: ua })
  if (error) console.error('security log failed:', error.message)
}

export async function recentFailures(userId: string, types: SecurityEventType[], minutes = 15) {
  const since = new Date(Date.now() - minutes * 60_000).toISOString()
  const { count } = await supabaseAdmin
    .from('security_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', types)
    .gte('created_at', since)
  return count ?? 0
}

// Re-authentication for sensitive changes. Uses a separate, throwaway client so the customer's
// real session is untouched (signing in on their own client would drop a two-step session to level 1).
export async function verifyPassword(email: string, password: string) {
  if (!email || !password) return false
  const client = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (!error) await client.auth.signOut({ scope: 'local' }) // revoke the throwaway session
  return !error
}
