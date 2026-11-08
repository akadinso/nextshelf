import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Profile = {
  full_name: string | null
  phone: string | null
  role: 'customer' | 'admin'
  onboarded: boolean
}

export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone, role, onboarded')
    .eq('id', user.id)
    .single()
  return (data as Profile | null) ?? null
})

export async function requireUser(next = '/') {
  const user = await getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`)
  return user
}

// Call this at the top of every admin page AND every admin server action
export async function requireAdmin() {
  const user = await requireUser('/admin')
  const profile = await getProfile()
  if (profile?.role !== 'admin') redirect('/')
  return user
}
