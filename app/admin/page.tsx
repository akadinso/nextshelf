import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatZAR } from '@/lib/format'
import type { Order } from '@/lib/types'

const REVENUE_STATUSES = ['paid', 'processing', 'shipped', 'delivered']

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [{ data: orderData }, { data: lowData }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, email, status, total_cents, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('is_active', true)
      .lte('stock_quantity', 5)
      .order('stock_quantity')
      .limit(10),
  ])

  const orders = (orderData ?? []) as Pick<Order, 'id' | 'order_number' | 'email' | 'status' | 'total_cents' | 'created_at'>[]
  const revenue = orders.filter((o) => REVENUE_STATUSES.includes(o.status)).reduce((s, o) => s + o.total_cents, 0)
  const toShip = orders.filter((o) => ['paid', 'processing'].includes(o.status)).length
  const low = (lowData ?? []) as { id: string; name: string; stock_quantity: number }[]

  const stats = [
    { label: 'Revenue (paid orders)', value: formatZAR(revenue) },
    { label: 'Orders to fulfil', value: String(toShip) },
    { label: 'Total orders', value: String(orders.length) },
  ]

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
        <ul className="divide-y rounded-lg border text-sm">
          {orders.slice(0, 5).map((o) => (
            <li key={o.id} className="flex items-center gap-4 p-3">
              <span className="font-medium">#{o.order_number}</span>
              <span className="flex-1 truncate text-muted-foreground">{o.email}</span>
              <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
              <StatusBadge status={o.status} />
              <span className="w-24 text-right">{formatZAR(o.total_cents)}</span>
            </li>
          ))}
          {orders.length === 0 && <li className="p-3 text-muted-foreground">No orders yet.</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Low stock (5 or fewer)</h2>
        <ul className="divide-y rounded-lg border text-sm">
          {low.map((p) => (
            <li key={p.id} className="flex items-center justify-between p-3">
              <Link href={`/admin/products/${p.id}`} className="hover:underline">
                {p.name}
              </Link>
              <span className={p.stock_quantity === 0 ? 'font-medium text-destructive' : ''}>
                {p.stock_quantity} left
              </span>
            </li>
          ))}
          {low.length === 0 && <li className="p-3 text-muted-foreground">Everything is well stocked.</li>}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          Products with variants track stock per variant, so check their edit page.
        </p>
      </section>
    </div>
  )
}
