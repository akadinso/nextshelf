import type { User } from '@supabase/supabase-js'
import { isValidPhone } from '@/lib/phone'

// What a customer must have before they can check out
export function getVerification(
  user: User,
  profile: { full_name: string | null; phone: string | null } | null
) {
  const emailVerified = !!user.email_confirmed_at
  const profileComplete = !!profile?.full_name?.trim() && isValidPhone(profile?.phone)
  return { emailVerified, profileComplete, ok: emailVerified && profileComplete }
}
