'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getUser } from '@/lib/auth'

// "Aka Dinso" -> "Aka D."
function displayName(fullName: string | null | undefined) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'Customer'
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

export async function submitReview(formData: FormData) {
  const slug = String(formData.get('slug') ?? '')
  const back = `/products/${slug}`
  const user = await getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`)

  const rating = parseInt(String(formData.get('rating') ?? ''), 10)
  const body = String(formData.get('body') ?? '').trim().slice(0, 1000)
  if (!(rating >= 1 && rating <= 5)) redirect(`${back}?review=invalid#reviews`)

  const profile = await getProfile()
  const supabase = await createClient()

  // RLS also enforces "must have bought this product"
  const { error } = await supabase.from('reviews').upsert(
    {
      product_id: String(formData.get('productId') ?? ''),
      user_id: user.id,
      author_name: displayName(profile?.full_name),
      rating,
      body: body || null,
    },
    { onConflict: 'product_id,user_id' }
  )

  if (error) redirect(`${back}?review=denied#reviews`)

  revalidatePath(back)
  revalidatePath('/')
  redirect(`${back}?review=saved#reviews`)
}
