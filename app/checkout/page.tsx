import { redirect } from 'next/navigation'
import CheckoutForm from '@/components/checkout-form'
import ProductImage from '@/components/product-image'
import { createClient } from '@/lib/supabase/server'
import { getProfile, requireUser } from '@/lib/auth'
import { getCart } from '@/lib/data'
import { cartSubtotalCents, unitPriceCents } from '@/lib/cart'
import { formatZAR } from '@/lib/format'
import { FLAT_SHIPPING_CENTS } from '@/lib/shipping'
import type { Address } from '@/lib/types'

export default async function CheckoutPage() {
  const user = await requireUser('/checkout')
  const [cart, profile] = await Promise.all([getCart(), getProfile()])
  if (cart.length === 0) redirect('/products')

  const supabase = await createClient()
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
  const addresses = (data ?? []) as Address[]

  const subtotal = cartSubtotalCents(cart)
  const total = subtotal + FLAT_SHIPPING_CENTS

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 md:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 text-2xl font-bold">Checkout</h1>
        <CheckoutForm
          addresses={addresses}
          defaultName={profile?.full_name ?? ''}
          defaultPhone={profile?.phone ?? ''}
        />
      </div>

      <aside className="h-fit rounded-lg border p-5">
        <h2 className="mb-4 font-semibold">Order summary</h2>
        <ul className="space-y-3">
          {cart.map((i) => (
            <li key={i.id} className="flex gap-3 text-sm">
              <ProductImage src={i.product.images[0]} alt={i.product.name} className="h-12 w-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{i.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {i.variant ? `${i.variant.name} · ` : ''}Qty {i.quantity}
                </p>
              </div>
              <p>{formatZAR(unitPriceCents(i) * i.quantity)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatZAR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span>{FLAT_SHIPPING_CENTS === 0 ? 'Free' : formatZAR(FLAT_SHIPPING_CENTS)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatZAR(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
