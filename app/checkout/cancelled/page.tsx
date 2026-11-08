import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cancelPendingOrder } from '@/app/actions/orders'
import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/lib/types'

export default async function CancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order: orderId } = await searchParams
  const supabase = await createClient()

  const { data } = orderId
    ? await supabase.from('orders').select('id, order_number, status').eq('id', orderId).maybeSingle()
    : { data: null }
  const order = data as Pick<Order, 'id' | 'order_number' | 'status'> | null

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Payment cancelled</h1>

      {order?.status === 'pending' ? (
        <>
          <p className="mt-2 text-muted-foreground">
            Your items for order #{order.order_number} are being held for a short while. Cancel the order to put
            everything back in your cart and try again.
          </p>
          <form action={cancelPendingOrder} className="mt-8">
            <input type="hidden" name="orderId" value={order.id} />
            <Button type="submit">Cancel order and return to shop</Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-muted-foreground">No payment was taken.</p>
          <Button asChild className="mt-8">
            <Link href="/products">Back to the shop</Link>
          </Button>
        </>
      )}
    </div>
  )
}
