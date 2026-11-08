'use server'

import { redirect } from "next/navigation"
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export async function addAddress(formData: FormData) {
  const user = await requireUser('/account/addresses')
  const supabase = await createClient()
  const get = (k: string) => String(formData.get(k) ?? '').trim()

  if (!get('recipient_name') || !get('street') || !get('city') || !get('province') || !get('postal_code')) {
    redirect('/account/addresses?error=' + encodeURIComponent('Please fill in all required fields.'))
  }

  const { count } = await supabase
    .from('addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  await supabase.from('addresses').insert({
    user_id: user.id,
    label: get('label') || null,
    recipient_name: get('recipient_name'),
    phone: get('phone') || null,
    street: get('street'),
    suburb: get('suburb') || null,
    city: get('city'),
    province: get('province'),
    postal_code: get('postal_code'),
    is_default: (count ?? 0) === 0, // first address becomes the default
  })

  revalidatePath('/account/addresses')
  redirect('/account/addresses')
}

export async function deleteAddress(formData: FormData) {
  const user = await requireUser('/account/addresses')
  const supabase = await createClient()
  await supabase
    .from('addresses')
    .delete()
    .eq('id', String(formData.get('id') ?? ''))
    .eq('user_id', user.id)
  revalidatePath('/account/addresses')
}

export async function setDefaultAddress(formData: FormData) {
  const user = await requireUser('/account/addresses')
  const supabase = await createClient()
  await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id)
  await supabase
    .from('addresses')
    .update({ is_default: true })
    .eq('id', String(formData.get('id') ?? ''))
    .eq('user_id', user.id)
  revalidatePath('/account/addresses')
}
