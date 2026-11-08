'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'

export async function toggleFavourite(formData: FormData) {
  const back = safeNext(formData.get('redirectTo'))
  const user = await getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`)

  const supabase = await createClient()
  const productId = String(formData.get('productId') ?? '')

  const { data: existing } = await supabase
    .from('favourites')
    .select('product_id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    await supabase.from('favourites').delete().eq('user_id', user.id).eq('product_id', productId)
  } else {
    await supabase.from('favourites').insert({ user_id: user.id, product_id: productId })
  }

  revalidatePath('/', 'layout')
}
