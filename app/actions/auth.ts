'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'
import { isValidPhone } from '@/lib/phone'
import { joinName } from '@/lib/security-checks'
import { logSecurityEvent } from '@/lib/security'

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const next = safeNext(formData.get('next'))

  const email = String(formData.get('email') ?? '').trim()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get('password') ?? ''),
  })
  if (error) {
    const q = new URLSearchParams({ error: error.message })
    if (/not confirmed/i.test(error.message)) q.set('email', email) // lets the page offer "resend"
    redirect(`/login?${q}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', data.user?.id ?? '')
    .single()

  revalidatePath('/', 'layout')
  const destination = profile?.onboarded ? next : '/onboarding'

  // Customers who turned on two-step verification still need to enter their code
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    redirect(`/login/mfa?next=${encodeURIComponent(destination)}`)
  }

  if (data.user?.id) await logSecurityEvent(data.user.id, 'login')
  redirect(destination)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) fail('/signup', 'Password must be at least 8 characters.')

  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get('email') ?? '').trim(),
    password,
    options: {
      data: { full_name: String(formData.get('full_name') ?? '').trim() },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) fail('/signup', error.message)

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect('/onboarding')
  }
  redirect('/login?message=' + encodeURIComponent('Check your email to confirm your account, then log in.'))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function completeOnboarding(formData: FormData) {
  const user = await requireUser('/onboarding')
  const supabase = await createClient()
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (fullName.length < 2) fail('/onboarding', 'Please enter your full name.')
  if (!isValidPhone(phone)) fail('/onboarding', 'Please enter a valid phone number, for example +27 82 123 4567.')
  await supabase
    .from('profiles')
    .update({ full_name: fullName, phone, onboarded: true })
    .eq('id', user.id)
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser('/account')
  const first = String(formData.get('first_name') ?? '').trim().slice(0, 50)
  const last = String(formData.get('last_name') ?? '').trim().slice(0, 50)
  const phone = String(formData.get('phone') ?? '').trim()
  const fullName = joinName(first, last)

  if (fullName.length < 2) fail('/account', 'Please enter your name.')
  if (!isValidPhone(phone)) fail('/account', 'Please enter a valid phone number, for example +27 82 123 4567.')

  const supabase = await createClient()
  await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)
  await logSecurityEvent(user.id, 'profile_updated')
  revalidatePath('/', 'layout')
  redirect('/account?saved=1')
}

// Sends the confirmation email again. Works logged out (login page) and logged in (verify page).
export async function resendConfirmation(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const onVerify = formData.get('returnTo') === '/verify'
  const next = safeNext(formData.get('next'))
  const back = onVerify ? `/verify?next=${encodeURIComponent(next)}&` : '/login?'
  if (!email) redirect(`${back}error=${encodeURIComponent('Enter your email address.')}`)

  const supabase = await createClient()
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) redirect(`${back}error=${encodeURIComponent(error.message)}`)
  redirect(`${back}message=${encodeURIComponent('Verification email sent. Check your inbox and spam folder.')}`)
}

// Name and phone number, required before checkout
export async function saveVerificationProfile(formData: FormData) {
  const user = await requireUser('/verify')
  const next = safeNext(formData.get('next'))
  const back = `/verify?next=${encodeURIComponent(next)}`
  const fullName = String(formData.get('full_name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  if (fullName.length < 2) redirect(`${back}&error=${encodeURIComponent('Please enter your full name.')}`)
  if (!isValidPhone(phone)) {
    redirect(`${back}&error=${encodeURIComponent('Please enter a valid phone number, for example +27 82 123 4567.')}`)
  }

  const supabase = await createClient()
  await supabase.from('profiles').update({ full_name: fullName, phone, onboarded: true }).eq('id', user.id)
  revalidatePath('/', 'layout')
  redirect(back) // the verify page forwards on once everything is complete
}
