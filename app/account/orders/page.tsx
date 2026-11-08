import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { formatDate, formatZAR } from '@/lib/format'
import type { Order } from '@/lib/types'

export default async function OrdersPage() {
  const user = await requireUser('/account/orders')
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  const orders = (data ?? []) as Order[]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Order history</h1>

      {orders.length === 0 ? (
        <p className="text-muted-foreground">
          You haven&apos;t placed any orders yet.{' '}
          <Link href="/products" className="underline">
            Start shopping
          </Link>
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/account/orders/${o.id}`} className="flex items-center gap-4 p-4 hover:bg-muted">
                <div className="flex-1">
                  <p className="font-medium">Order #{o.order_number}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(o.created_at)}</p>
                </div>
                <StatusBadge status={o.status} />
                <p className="w-24 text-right font-medium">{formatZAR(o.total_cents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
