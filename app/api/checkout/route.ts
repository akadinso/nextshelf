import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // your existing SSR client (cookie-based)
import { supabaseAdmin } from '@/lib/supabase/admin'
import { buildPayfastUrl } from '@/lib/payfast'
import { FLAT_SHIPPING_CENTS } from '@/lib/shipping'

const REQUIRED = ['recipient_name', 'street', 'city', 'province', 'postal_code'] as const

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Please sign in to check out.' }, { status: 401 })
  }

  const { address, notes } = await req.json()

  if (!address || REQUIRED.some((k) => !String(address[k] ?? '').trim())) {
    return NextResponse.json({ error: 'Please complete your delivery address.' }, { status: 400 })
  }

  const shippingCents = FLAT_SHIPPING_CENTS // edit lib/shipping.ts

  // Prices, stock check and order creation all happen inside one DB transaction
  const { data: order, error } = await supabaseAdmin.rpc('create_order_from_cart', {
    p_user_id: user.id,
    p_email: user.email,
    p_shipping_address: address,
    p_shipping_cents: shippingCents,
    p_notes: notes ?? null,
  })

  if (error || !order) {
    const msg = error?.message ?? ''
    if (msg.includes('CART_EMPTY')) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 })
    }
    if (msg.includes('OUT_OF_STOCK')) {
      const item = msg.split('OUT_OF_STOCK:')[1]?.trim()
      return NextResponse.json({ error: `Sorry, ${item} is out of stock.` }, { status: 409 })
    }
    if (msg.includes('PRODUCT_UNAVAILABLE')) {
      return NextResponse.json({ error: 'An item in your cart is no longer available.' }, { status: 409 })
    }
    console.error('create_order_from_cart failed', error)
    return NextResponse.json({ error: 'Could not start checkout.' }, { status: 500 })
  }

  const url = buildPayfastUrl({
    id: order.id,
    order_number: order.order_number,
    total_cents: order.total_cents,
    email: order.email,
    recipient_name: address.recipient_name,
    phone: address.phone,
  })

  return NextResponse.json({ url })
}
