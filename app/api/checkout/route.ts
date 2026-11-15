import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getAal, getProfile } from '@/lib/auth'
import { sameOrigin } from '@/lib/security-checks'
import { buildPayfastUrl } from '@/lib/payfast'
import { validateAddress } from '@/lib/address'
import { shippingCentsFor } from '@/lib/shipping'
import { SITE } from '@/lib/site'
import { getVerification } from '@/lib/verification'

export async function POST(req: Request) {
  // CSRF defence: only our own pages may call this endpoint
  let siteHost: string | null = null
  try {
    siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').host
  } catch {
    /* no site URL configured: fall back to the Host header only */
  }
  if (!sameOrigin(req, siteHost)) {
    return NextResponse.json({ error: 'Request blocked.' }, { status: 403 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: 'Please sign in to check out.' }, { status: 401 })
  }

  // Customers who turned on two-step verification must have completed it in this session
  const aal = await getAal()
  if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    return NextResponse.json(
      { error: 'Please finish two-step verification first.', redirect: '/login/mfa?next=/checkout' },
      { status: 403 }
    )
  }

  // Server-side check: the checkout page redirect alone is not enough
  if (SITE.requireVerification) {
    const v = getVerification(user, await getProfile())
    if (!v.ok) {
      return NextResponse.json(
        {
          error: v.emailVerified
            ? 'Please add your name and phone number before checking out.'
            : 'Please verify your email address before checking out.',
          redirect: '/verify?next=/checkout',
        },
        { status: 403 }
      )
    }
  }

  const body = await req.json().catch(() => ({}))

  const delivery = validateAddress(body?.address ?? {}, { requirePhone: true, checkShipping: true })
  if (!delivery.ok) return NextResponse.json({ error: delivery.error }, { status: 400 })

  let billing = delivery.value
  if (body?.billing) {
    const b = validateAddress(body.billing)
    if (!b.ok) return NextResponse.json({ error: `Billing address: ${b.error}` }, { status: 400 })
    billing = b.value
  }

  // Prices, stock check and order creation all happen inside one DB transaction
  const { data: order, error } = await supabaseAdmin.rpc('create_order_from_cart', {
    p_user_id: user.id,
    p_email: user.email,
    p_shipping_address: delivery.value,
    p_shipping_cents: shippingCentsFor(delivery.value.country),
    p_notes: typeof body?.notes === 'string' ? body.notes.slice(0, 500) : null,
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

  // Keep the billing address with the order. The payment can still go ahead if this fails.
  const { error: billingError } = await supabaseAdmin
    .from('orders')
    .update({ billing_address: billing })
    .eq('id', order.id)
  if (billingError) console.error('saving billing address failed', billingError)

  const url = buildPayfastUrl({
    id: order.id,
    order_number: order.order_number,
    total_cents: order.total_cents,
    email: order.email,
    recipient_name: delivery.value.recipient_name,
  })

  return NextResponse.json({ url })
}
