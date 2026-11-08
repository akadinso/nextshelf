import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import type { CartItem, Category, Product } from '@/lib/types'

// Product cards need to know whether a product has variants (to decide on quick-add)
export const CARD_SELECT = '*, variants:product_variants(count)'

export const getCart = cache(async (): Promise<CartItem[]> => {
  const user = await getUser()
  if (!user) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('cart_items')
    .select(
      'id, quantity, variant_id, product:products(id, name, slug, price_cents, stock_quantity, images), variant:product_variants(id, name, price_cents, stock_quantity)'
    )
    .eq('user_id', user.id)
    .order('created_at')
  return (data ?? []) as unknown as CartItem[]
})

export const getFavourites = cache(async (): Promise<Product[]> => {
  const user = await getUser()
  if (!user) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('favourites')
    .select('product:products(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as unknown as { product: Product | null }[]
  return rows.map((r) => r.product).filter((p): p is Product => !!p && p.is_active)
})

export async function getFavouriteIds() {
  return (await getFavourites()).map((p) => p.id)
}

export const getTopCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .is('parent_id', null)
    .order('sort_order')
  return (data ?? []) as Category[]
})
