import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { pfParamString, pfSignature, PAYFAST_VALIDATE_URL } from '@/lib/payfast'

// PayFast ITN (Instant Transaction Notification). Must be publicly reachable:
// use ngrok or a deployed URL in development, not localhost.
export async function POST(req: Request) {
  const raw = await req.text()
  const params = new URLSearchParams(raw)

  // Rebuild the fields in the order PayFast sent them, minus the signature
  const pairs: [string, string][] = []
  params.forEach((value, key) => {
    if (key !== 'signature') pairs.push([key, value])
  })

  // 1. Signature check
  if (params.get('signature') !== pfSignature(pairs)) {
    console.warn('PayFast ITN: bad signature')
    return new NextResponse('Invalid signature', { status: 400 })
  }

  // 2. Server-to-server confirmation with PayFast
  const confirm = await fetch(PAYFAST_VALIDATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: pfParamString(pairs),
  })
  if ((await confirm.text()).trim() !== 'VALID') {
    console.warn('PayFast ITN: validation failed')
    return new NextResponse('Not validated', { status: 400 })
  }

  // 3. Match the order and check the amount against OUR total, not the request
  const orderId = params.get('m_payment_id')
  const status = params.get('payment_status')
  const paidCents = Math.round(parseFloat(params.get('amount_gross') ?? '0') * 100)

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, total_cents')
    .eq('id', orderId ?? '')
    .maybeSingle()

  if (!order) {
    return new NextResponse('Unknown order', { status: 400 })
  }

  if (status === 'COMPLETE') {
    if (paidCents !== order.total_cents) {
      console.error(`PayFast ITN: amount mismatch for ${order.id} (${paidCents} vs ${order.total_cents})`)
      return new NextResponse('Amount mismatch', { status: 400 })
    }

    const { data: result, error } = await supabaseAdmin.rpc('confirm_payment', {
      p_order_id: order.id,
      p_provider: 'payfast',
      p_reference: params.get('pf_payment_id'),
      p_amount_cents: paidCents,
      p_payload: Object.fromEntries(params),
    })

    if (error) {
      console.error('confirm_payment failed', error)
      return new NextResponse('Error', { status: 500 }) // PayFast will retry
    }
    if (result === 'needs_review') {
      console.error(`Order ${order.id} was paid but is no longer pending. Fulfil or refund manually.`)
    }
  } else if (status === 'CANCELLED' || status === 'FAILED') {
    await supabaseAdmin.rpc('cancel_order', { p_order_id: order.id })
  }

  // PayFast needs a quick 200 to stop retrying
  return new NextResponse('OK', { status: 200 })
}
