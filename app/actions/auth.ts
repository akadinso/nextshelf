'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'

function fail(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const next = safeNext(formData.get('next'))

  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  })
  if (error) fail('/login', error.message)

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', data.user?.id ?? '')
    .single()

  revalidatePath('/', 'layout')
  redirect(profile?.onboarded ? next : '/onboarding')
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
  await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
      onboarded: true,
    })
    .eq('id', user.id)
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser('/account')
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({
      full_name: String(formData.get('full_name') ?? '').trim() || null,
      phone: String(formData.get('phone') ?? '').trim() || null,
    })
    .eq('id', user.id)
  revalidatePath('/account')
  redirect('/account?saved=1')
}
