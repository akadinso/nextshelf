'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'

export async function addToCart(formData: FormData) {
  const back = safeNext(formData.get('redirectTo'))
  const user = await getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(back)}`)

  const supabase = await createClient()
  const productId = String(formData.get('productId') ?? '')
  const variantId = String(formData.get('variantId') ?? '') || null
  const qty = Math.max(1, parseInt(String(formData.get('quantity') ?? '1'), 10) || 1)

  // Available stock for the chosen product / variant
  let stock = 0
  if (variantId) {
    const { data } = await supabase
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', variantId)
      .eq('product_id', productId)
      .single()
    stock = data?.stock_quantity ?? 0
  } else {
    const { data } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .eq('is_active', true)
      .single()
    stock = data?.stock_quantity ?? 0
  }
  if (stock < 1) return

  const base = supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
  const { data: existing } = await (variantId
    ? base.eq('variant_id', variantId)
    : base.is('variant_id', null)
  ).maybeSingle()

  const newQty = Math.min((existing?.quantity ?? 0) + qty, stock)

  if (existing) {
    await supabase.from('cart_items').update({ quantity: newQty }).eq('id', existing.id)
  } else {
    await supabase
      .from('cart_items')
      .insert({ user_id: user.id, product_id: productId, variant_id: variantId, quantity: newQty })
  }

  revalidatePath('/', 'layout')
}

export async function updateCartQty(formData: FormData) {
  const supabase = await createClient()
  const id = String(formData.get('itemId') ?? '')
  const qty = parseInt(String(formData.get('quantity') ?? '0'), 10)

  if (!(qty >= 1)) {
    await supabase.from('cart_items').delete().eq('id', id)
  } else {
    const { data } = await supabase
      .from('cart_items')
      .select('variant:product_variants(stock_quantity), product:products(stock_quantity)')
      .eq('id', id)
      .single()
    const item = data as unknown as {
      variant: { stock_quantity: number } | null
      product: { stock_quantity: number } | null
    } | null
    const stock = item?.variant?.stock_quantity ?? item?.product?.stock_quantity ?? qty
    await supabase.from('cart_items').update({ quantity: Math.min(qty, Math.max(stock, 1)) }).eq('id', id)
  }

  revalidatePath('/', 'layout')
}

export async function removeFromCart(formData: FormData) {
  const supabase = await createClient()
  await supabase.from('cart_items').delete().eq('id', String(formData.get('itemId') ?? ''))
  revalidatePath('/', 'layout')
}
