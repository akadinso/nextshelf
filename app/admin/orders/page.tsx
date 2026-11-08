import { Button } from '@/components/ui/button'
import StatusBadge from '@/components/status-badge'
import { updateOrderStatus } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatZAR } from '@/lib/format'
import type { Order, OrderItem } from '@/lib/types'

type FullOrder = Order & { items: OrderItem[] }

export default async function AdminOrdersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false })
  const orders = (data ?? []) as unknown as FullOrder[]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Orders ({orders.length})</h1>

      <ul className="space-y-3">
        {orders.map((o) => {
          const a = o.shipping_address
          const canUpdate = ['paid', 'processing', 'shipped', 'delivered'].includes(o.status)
          return (
            <li key={o.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">#{o.order_number}</span>
                <StatusBadge status={o.status} />
                <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
                <span className="truncate text-muted-foreground">{o.email}</span>
                <span className="ml-auto font-medium">{formatZAR(o.total_cents)}</span>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-muted-foreground">Items and delivery address</summary>
                <ul className="mt-2 space-y-1">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.quantity} × {i.name}
                      {i.variant_name ? ` (${i.variant_name})` : ''} · {formatZAR(i.unit_price_cents)}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-muted-foreground">
                  {a.recipient_name}
                  {a.phone ? ` · ${a.phone}` : ''}
                  <br />
                  {a.street}
                  {a.suburb ? `, ${a.suburb}` : ''}, {a.city}, {a.province} {a.postal_code}
                </p>
              </details>

              {canUpdate && (
                <form action={updateOrderStatus} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <select
                    name="status"
                    defaultValue={o.status === 'paid' ? 'processing' : o.status}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    Update status
                  </Button>
                </form>
              )}
            </li>
          )
        })}
        {orders.length === 0 && <li className="text-muted-foreground">No orders yet.</li>}
      </ul>
    </div>
  )
}
