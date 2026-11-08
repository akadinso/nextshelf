import Link from 'next/link'
import { Button } from '@/components/ui/button'
import AutoRefresh from '@/components/auto-refresh'
import { createClient } from '@/lib/supabase/server'
import { formatZAR } from '@/lib/format'
import type { Order } from '@/lib/types'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order: orderId } = await searchParams
  const supabase = await createClient()

  const { data } = orderId
    ? await supabase.from('orders').select('*').eq('id', orderId).maybeSingle()
    : { data: null }
  const order = data as Order | null

  const confirmed = !!order && !['pending', 'cancelled'].includes(order.status)

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <AutoRefresh active={order?.status === 'pending'} />

      {confirmed ? (
        <>
          <h1 className="text-2xl font-bold">Thank you for your order!</h1>
          <p className="mt-2 text-muted-foreground">
            Order #{order!.order_number} · {formatZAR(order!.total_cents)}. We&apos;ve got your payment and will
            start packing your items.
          </p>
        </>
      ) : order?.status === 'pending' ? (
        <>
          <h1 className="text-2xl font-bold">Confirming your payment…</h1>
          <p className="mt-2 text-muted-foreground">
            Order #{order.order_number}. This usually takes a few seconds. This page will update on its own.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">We couldn&apos;t find that order</h1>
          <p className="mt-2 text-muted-foreground">Check your order history for the latest status.</p>
        </>
      )}

      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link href="/account/orders">View my orders</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">Keep shopping</Link>
        </Button>
      </div>
    </div>
  )
}
