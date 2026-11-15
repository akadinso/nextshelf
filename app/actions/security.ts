'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUser, requireUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'
import { SITE } from '@/lib/site'
import { isEmail, passwordProblem } from '@/lib/security-checks'
import { logSecurityEvent, MAX_FAILURES, recentFailures, verifyPassword } from '@/lib/security'

function back(path: string, kind: 'error' | 'message', text: string): never {
  redirect(`${path}?${kind}=${encodeURIComponent(text)}`)
}

// Sensitive changes ask for the current password, and slow down guessing
async function reauthenticate(userId: string, email: string, password: string, path: string) {
  if ((await recentFailures(userId, ['reauth_failed'])) >= MAX_FAILURES) {
    back(path, 'error', 'Too many wrong attempts. Please wait 15 minutes and try again.')
  }
  if (!(await verifyPassword(email, password))) {
    await logSecurityEvent(userId, 'reauth_failed')
    back(path, 'error', 'Your current password is not correct.')
  }
}

export async function changePassword(formData: FormData) {
  const path = '/account/security'
  const user = await requireUser(path)
  const current = String(formData.get('current_password') ?? '')
  const next = String(formData.get('new_password') ?? '')
  const confirm = String(formData.get('confirm_password') ?? '')

  await reauthenticate(user.id, user.email ?? '', current, path)
  if (next !== confirm) back(path, 'error', 'The new passwords do not match.')
  if (next === current) back(path, 'error', 'Your new password must be different from the current one.')
  const problem = passwordProblem(next, user.email)
  if (problem) back(path, 'error', problem)

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) back(path, 'error', error.message)

  await supabase.auth.signOut({ scope: 'others' }) // anyone else holding a session is signed out
  await logSecurityEvent(user.id, 'password_changed')
  back(path, 'message', 'Password updated. Your other devices have been signed out.')
}

export async function changeEmail(formData: FormData) {
  const path = '/account'
  const user = await requireUser(path)
  const newEmail = String(formData.get('new_email') ?? '').trim().toLowerCase()

  await reauthenticate(user.id, user.email ?? '', String(formData.get('current_password') ?? ''), path)
  if (!isEmail(newEmail)) back(path, 'error', 'Please enter a valid email address.')
  if (newEmail === user.email?.toLowerCase()) back(path, 'error', 'That is already your email address.')

  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: newEmail }, { emailRedirectTo: `${origin}/auth/callback` })
  if (error) back(path, 'error', error.message)

  await logSecurityEvent(user.id, 'email_change_requested')
  back(path, 'message', 'We sent a confirmation link. Your email changes once you open it. Check your old and new inboxes.')
}

export async function signOutOtherDevices() {
  const user = await requireUser('/account/security')
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'others' })
  await logSecurityEvent(user.id, 'signed_out_others')
  back('/account/security', 'message', 'All your other devices have been signed out.')
}

// ---------- two-step verification (authenticator app) ----------
type Fail = { ok: false; error: string }

export async function startMfaEnrollment(): Promise<{ ok: true; factorId: string; qr: string; secret: string } | Fail> {
  await requireUser('/account/security')
  const supabase = await createClient()

  // clear abandoned set-ups so the customer can simply try again
  const { data: existing } = await supabase.auth.mfa.listFactors()
  for (const f of existing?.all ?? []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: SITE.name,
    friendlyName: `Authenticator ${Date.now()}`,
  })
  if (error || !data) return { ok: false, error: error?.message ?? 'Could not start set-up. Please try again.' }
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

export async function confirmMfaEnrollment(factorId: string, code: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser('/account/security')
  const clean = String(code).replace(/\s/g, '')
  if (!/^[0-9a-f-]{36}$/i.test(factorId) || !/^\d{6}$/.test(clean)) {
    return { ok: false, error: 'Enter the 6-digit code from your authenticator app.' }
  }
  if ((await recentFailures(user.id, ['mfa_failed'])) >= MAX_FAILURES) {
    return { ok: false, error: 'Too many wrong codes. Please wait 15 minutes and try again.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: clean })
  if (error) {
    await logSecurityEvent(user.id, 'mfa_failed')
    return { ok: false, error: 'That code is not correct. Check your authenticator app and try again.' }
  }

  await logSecurityEvent(user.id, 'mfa_enabled')
  revalidatePath('/account/security')
  return { ok: true }
}

export async function disableMfa(factorId: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser('/account/security') // already requires a two-step session
  if (!/^[0-9a-f-]{36}$/i.test(factorId)) return { ok: false, error: 'Something went wrong.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { ok: false, error: error.message }
  await logSecurityEvent(user.id, 'mfa_disabled')
  revalidatePath('/account/security')
  return { ok: true }
}

// Second step of signing in, for customers who turned two-step verification on
export async function verifyLoginMfa(formData: FormData) {
  const user = await getUser()
  if (!user) redirect('/login')
  const next = safeNext(formData.get('next'))
  const here = `/login/mfa?next=${encodeURIComponent(next)}`

  if ((await recentFailures(user.id, ['mfa_failed'])) >= MAX_FAILURES) {
    redirect(`${here}&error=${encodeURIComponent('Too many wrong codes. Please wait 15 minutes and try again.')}`)
  }

  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const factor = factors?.totp?.[0] // verified authenticator-app factors only
  if (!factor) redirect(next)

  const code = String(formData.get('code') ?? '').replace(/\s/g, '')
  if (!/^\d{6}$/.test(code)) redirect(`${here}&error=${encodeURIComponent('Enter the 6-digit code from your app.')}`)

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
  if (error) {
    await logSecurityEvent(user.id, 'mfa_failed')
    redirect(`${here}&error=${encodeURIComponent('That code is not correct. Please try again.')}`)
  }

  await logSecurityEvent(user.id, 'login')
  revalidatePath('/', 'layout')
  redirect(next)
}
