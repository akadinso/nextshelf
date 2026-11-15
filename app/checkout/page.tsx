import { redirect } from 'next/navigation'
import CheckoutForm, { type SummaryItem } from '@/components/checkout-form'
import { createClient } from '@/lib/supabase/server'
import { getProfile, requireUser } from '@/lib/auth'
import { getCart } from '@/lib/data'
import { cartSubtotalCents, unitPriceCents } from '@/lib/cart'
import { isPlacesEnabled } from '@/lib/places'
import { SITE } from '@/lib/site'
import { getVerification } from '@/lib/verification'
import type { Address } from '@/lib/types'

export default async function CheckoutPage() {
  const user = await requireUser('/checkout')
  const [cart, profile] = await Promise.all([getCart(), getProfile()])

  // Customers must be verified before they can pay
  if (SITE.requireVerification && !getVerification(user, profile).ok) redirect('/verify?next=/checkout')
  if (cart.length === 0) redirect('/products')

  const supabase = await createClient()
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })

  const items: SummaryItem[] = cart.map((i) => ({
    id: i.id,
    name: i.product.name,
    variantName: i.variant?.name ?? null,
    quantity: i.quantity,
    lineCents: unitPriceCents(i) * i.quantity,
    image: i.product.images[0],
  }))

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>
      <CheckoutForm
        addresses={(data ?? []) as Address[]}
        items={items}
        subtotalCents={cartSubtotalCents(cart)}
        defaultName={profile?.full_name ?? ''}
        defaultPhone={profile?.phone ?? ''}
        placesEnabled={isPlacesEnabled()}
      />
    </div>
  )
}
