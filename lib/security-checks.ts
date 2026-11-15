// Pure functions (no server imports) so they can be unit-tested.

// Passphrase-style policy: length matters most. Breached-password checking is handled by
// Supabase "Leaked password protection" (a Supabase Pro setting), not here.
const COMMON = ['password', 'passw0rd', 'qwerty', '123456', 'letmein', 'welcome', 'admin', 'iloveyou', 'abc123']

export function passwordProblem(password: string, email?: string | null): string | null {
  if (password.length < 12) return 'Use at least 12 characters. A short phrase of a few words works well.'
  if (password.length > 128) return 'That password is too long (128 characters maximum).'
  if (/^(.)\1+$/.test(password)) return 'Please do not repeat one character.'
  const lower = password.toLowerCase()
  if (COMMON.some((w) => lower.includes(w))) return 'That password is too easy to guess. Try a longer, less common phrase.'
  const local = (email ?? '').split('@')[0]?.toLowerCase()
  if (local && local.length >= 4 && lower.includes(local)) return 'Your password should not contain your email name.'
  return null
}

export function isEmail(v: string) {
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
}

// CSRF defence for JSON API routes: a browser always sends Origin on a cross-site POST,
// so require it and require it to match our own host.
export function sameOrigin(req: Request, allowedHost?: string | null): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return false
  let host: string
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  const ours = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  return host === ours || (!!allowedHost && host === allowedHost)
}

// "Aka Dinso" <-> first / last, without needing a new database column
export function splitName(full?: string | null) {
  const t = (full ?? '').trim()
  const i = t.indexOf(' ')
  return i === -1 ? { first: t, last: '' } : { first: t.slice(0, i), last: t.slice(i + 1).trim() }
}
export const joinName = (first: string, last: string) => `${first.trim()} ${last.trim()}`.trim()

export const SECURITY_EVENT_LABELS: Record<string, string> = {
  login: 'Signed in',
  password_changed: 'Password changed',
  email_change_requested: 'Email change requested',
  mfa_enabled: 'Two-step verification turned on',
  mfa_disabled: 'Two-step verification turned off',
  signed_out_others: 'Signed out of other devices',
  profile_updated: 'Profile details updated',
  reauth_failed: 'Wrong password entered for a security change',
  mfa_failed: 'Wrong two-step verification code entered',
}

export type SecurityEventType = keyof typeof SECURITY_EVENT_LABELS
