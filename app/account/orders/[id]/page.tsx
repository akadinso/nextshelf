import Link from 'next/link'
import { notFound } from 'next/navigation'
import StatusBadge from '@/components/status-badge'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { formatDate, formatZAR } from '@/lib/format'
import type { Order, OrderItem } from '@/lib/types'

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser(`/account/orders/${id}`)
  const supabase = await createClient()

  const { data: orderData } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!orderData) notFound()
  const order = orderData as Order

  const { data: itemData } = await supabase.from('order_items').select('*').eq('order_id', id)
  const items = (itemData ?? []) as OrderItem[]
  const a = order.shipping_address

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/account/orders" className="text-sm text-muted-foreground hover:underline">
        ← All orders
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-muted-foreground">Placed {formatDate(order.created_at)}</p>

      <ul className="mt-6 divide-y rounded-lg border">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-4 p-4 text-sm">
            <div className="flex-1">
              <p className="font-medium">{i.name}</p>
              <p className="text-muted-foreground">
                {i.variant_name ? `${i.variant_name} · ` : ''}
                {i.quantity} × {formatZAR(i.unit_price_cents)}
              </p>
            </div>
            <p>{formatZAR(i.unit_price_cents * i.quantity)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatZAR(order.subtotal_cents)}</span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span>{order.shipping_cents === 0 ? 'Free' : formatZAR(order.shipping_cents)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{formatZAR(order.total_cents)}</span>
        </div>
      </div>

      <div className="mt-8 text-sm">
        <h2 className="mb-1 font-semibold">Delivery address</h2>
        <p className="text-muted-foreground">
          {a.recipient_name}
          <br />
          {a.street}
          {a.suburb ? `, ${a.suburb}` : ''}
          <br />
          {a.city}, {a.province} {a.postal_code}
        </p>
      </div>
    </div>
  )
}
