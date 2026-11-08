'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'

// Customer clicked "Cancel order" after backing out of PayFast.
// Releases the reserved stock and puts the items back in their cart.
export async function cancelPendingOrder(formData: FormData) {
  const user = await requireUser('/account/orders')
  const orderId = String(formData.get('orderId') ?? '')

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (order?.status === 'pending') {
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('product_id, variant_id, quantity')
      .eq('order_id', order.id)

    await supabaseAdmin.rpc('cancel_order', { p_order_id: order.id })

    for (const i of items ?? []) {
      if (!i.product_id) continue
      // ignore conflicts if they already re-added the item
      await supabaseAdmin
        .from('cart_items')
        .insert({ user_id: user.id, product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })
    }
  }

  revalidatePath('/', 'layout')
  redirect('/products')
}
