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

type Fail = { ok: false; error: string }

const UUID_RE = /^[0-9a-f-]{36}$/i
const E164_RE = /^\+[1-9]\d{7,14}$/

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

  await supabase.auth.signOut({ scope: 'others' })
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
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${origin}/auth/callback` },
  )
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

// ---------- two-step verification (authenticator app & SMS) ----------

export async function startMfaEnrollment(): Promise<
  { ok: true; factorId: string; qr: string; secret: string } | Fail
> {
  await requireUser('/account/security')
  const supabase = await createClient()

  // Clear abandoned unverified TOTP set-ups so the user can retry cleanly
  const { data: existing } = await supabase.auth.mfa.listFactors()
  for (const f of existing?.all ?? []) {
    if (f.factor_type === 'totp' && f.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: SITE.name,
    friendlyName: `Authenticator ${Date.now()}`,
  })
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not start set-up. Please try again.' }
  }
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret }
}

export async function confirmMfaEnrollment(factorId: string, code: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser('/account/security')
  const clean = String(code).replace(/\D/g, '')
  if (!UUID_RE.test(factorId) || !/^\d{6}$/.test(clean)) {
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

export async function startPhoneMfaEnrollment(
  phone: string,
): Promise<{ ok: true; factorId: string; challengeId: string } | Fail> {
  const user = await requireUser('/account/security')
  const cleanPhone = String(phone).trim()
  if (!E164_RE.test(cleanPhone)) {
    return { ok: false, error: 'Enter a valid mobile number with country code (e.g. +27821234567).' }
  }
  if ((await recentFailures(user.id, ['mfa_failed'])) >= MAX_FAILURES) {
    return { ok: false, error: 'Too many attempts. Please wait 15 minutes and try again.' }
  }

  const supabase = await createClient()

  // Clear abandoned unverified phone factors
  const { data: existing } = await supabase.auth.mfa.listFactors()
  for (const f of existing?.all ?? []) {
    if (f.factor_type === 'phone' && f.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
  }

  const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'phone',
    phone: cleanPhone,
    friendlyName: `Phone ${cleanPhone}`,
  })
  if (enrollError || !enrolled) {
    return { ok: false, error: enrollError?.message ?? 'Could not register that phone number.' }
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: enrolled.id,
  })
  if (challengeError || !challenge) {
    return { ok: false, error: challengeError?.message ?? 'Could not send verification SMS.' }
  }

  return { ok: true, factorId: enrolled.id, challengeId: challenge.id }
}

export async function confirmPhoneMfaEnrollment(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<{ ok: true } | Fail> {
  const user = await requireUser('/account/security')
  const clean = String(code).replace(/\D/g, '')
  if (!UUID_RE.test(factorId) || !UUID_RE.test(challengeId) || !/^\d{6}$/.test(clean)) {
    return { ok: false, error: 'Enter the 6-digit code sent to your phone.' }
  }
  if ((await recentFailures(user.id, ['mfa_failed'])) >= MAX_FAILURES) {
    return { ok: false, error: 'Too many wrong codes. Please wait 15 minutes and try again.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: clean })
  if (error) {
    await logSecurityEvent(user.id, 'mfa_failed')
    return { ok: false, error: 'That code is not correct. Please check the SMS and try again.' }
  }

  await logSecurityEvent(user.id, 'mfa_phone_enabled')
  revalidatePath('/account/security')
  return { ok: true }
}

export async function disableMfa(factorId: string): Promise<{ ok: true } | Fail> {
  const user = await requireUser('/account/security')
  if (!UUID_RE.test(factorId)) return { ok: false, error: 'Something went wrong.' }
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { ok: false, error: error.message }
  await logSecurityEvent(user.id, 'mfa_disabled')
  revalidatePath('/account/security')
  return { ok: true }
}

export async function sendLoginSmsCode(): Promise<
  { ok: true; challengeId: string; factorId: string } | Fail
> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Your session expired. Please sign in again.' }

  if ((await recentFailures(user.id, ['mfa_failed'])) >= MAX_FAILURES) {
    return { ok: false, error: 'Too many attempts. Please wait 15 minutes and try again.' }
  }

  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const phoneFactor = factors?.phone?.[0]
  if (!phoneFactor) {
    return { ok: false, error: 'No verified phone number is set up on this account.' }
  }

  const { data, error } = await supabase.auth.mfa.challenge({ factorId: phoneFactor.id })
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not send the SMS code. Try again shortly.' }
  }

  return { ok: true, challengeId: data.id, factorId: phoneFactor.id }
}

export async function verifyLoginMfa(formData: FormData) {
  const user = await getUser()
  if (!user) redirect('/login')
  const next = safeNext(formData.get('next'))
  const method = formData.get('method') === 'sms' ? 'sms' : 'app'
  const here = `/login/mfa?next=${encodeURIComponent(next)}`

  if ((await recentFailures(user.id, ['mfa_failed'])) >= MAX_FAILURES) {
    redirect(`${here}&error=${encodeURIComponent('Too many wrong codes. Please wait 15 minutes and try again.')}`)
  }

  const code = String(formData.get('code') ?? '').replace(/\D/g, '')
  if (!/^\d{6}$/.test(code)) {
    redirect(`${here}&error=${encodeURIComponent('Enter the 6-digit verification code.')}`)
  }

  const supabase = await createClient()
  const { data: factors } = await supabase.auth.mfa.listFactors()

  if (method === 'sms') {
    const phoneFactor = factors?.phone?.[0]
    const challengeId = String(formData.get('challengeId') ?? '')
    if (!phoneFactor || !UUID_RE.test(challengeId)) {
      redirect(`${here}&error=${encodeURIComponent('Request a new text message code and try again.')}`)
    }

    const { error } = await supabase.auth.mfa.verify({
      factorId: phoneFactor.id,
      challengeId,
      code,
    })
    if (error) {
      await logSecurityEvent(user.id, 'mfa_failed')
      redirect(`${here}&error=${encodeURIComponent('That code is not correct. Please try again.')}`)
    }
  } else {
    const totpFactor = factors?.totp?.[0]
    if (!totpFactor) redirect(next)

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpFactor.id,
      code,
    })
    if (error) {
      await logSecurityEvent(user.id, 'mfa_failed')
      redirect(`${here}&error=${encodeURIComponent('That code is not correct. Please try again.')}`)
    }
  }

  await logSecurityEvent(user.id, 'login')
  revalidatePath('/', 'layout')
  redirect(next)
}