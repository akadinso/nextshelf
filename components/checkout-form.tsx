'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import AddressForm from '@/components/address-form'
import ProductImage from '@/components/product-image'
import { EMPTY_ADDRESS, validateAddress, type AddressInput } from '@/lib/address'
import { getCountryName } from '@/lib/countries'
import { formatZAR } from '@/lib/format'
import { HOME_COUNTRY, shippingCentsFor } from '@/lib/shipping'
import type { Address } from '@/lib/types'

export type SummaryItem = {
  id: string
  name: string
  variantName: string | null
  quantity: number
  lineCents: number
  image?: string
}

const toInput = (a: Address): AddressInput => ({
  recipient_name: a.recipient_name,
  phone: a.phone ?? '',
  street: a.street,
  suburb: a.suburb ?? '',
  city: a.city,
  province: a.province,
  postal_code: a.postal_code,
  country: a.country || HOME_COUNTRY,
})

export default function CheckoutForm({
  addresses,
  items,
  subtotalCents,
  defaultName,
  defaultPhone,
  placesEnabled,
}: {
  addresses: Address[]
  items: SummaryItem[]
  subtotalCents: number
  defaultName: string
  defaultPhone: string
  placesEnabled: boolean
}) {
  const initial = addresses.find((a) => a.is_default) ?? addresses[0]
  const [savedId, setSavedId] = useState<string>(initial?.id ?? 'new')
  const [newAddress, setNewAddress] = useState<AddressInput>({
    ...EMPTY_ADDRESS,
    recipient_name: defaultName,
    phone: defaultPhone,
  })
  const [sameBilling, setSameBilling] = useState(true)
  const [billing, setBilling] = useState<AddressInput>({ ...EMPTY_ADDRESS, recipient_name: defaultName })
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const saved = addresses.find((a) => a.id === savedId)
  const delivery: AddressInput = saved ? toInput(saved) : newAddress

  const shippingCents = shippingCentsFor(delivery.country)
  const totalCents = subtotalCents + shippingCents
  const international = delivery.country !== HOME_COUNTRY

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const d = validateAddress(delivery, { requirePhone: true, checkShipping: true })
    if (!d.ok) return setError(`Delivery address: ${d.error}`)
    let b = null
    if (!sameBilling) {
      const r = validateAddress(billing)
      if (!r.ok) return setError(`Billing address: ${r.error}`)
      b = r.value
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: d.value, billing: b, notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.redirect) {
        window.location.href = json.redirect
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      window.location.href = json.url // PayFast
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-10 md:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Delivery address</h2>

          {addresses.length > 0 && (
            <select
              value={savedId}
              onChange={(e) => setSavedId(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label ? `${a.label}: ` : ''}
                  {a.street}, {a.city}, {getCountryName(a.country)}
                </option>
              ))}
              <option value="new">+ Use a new address</option>
            </select>
          )}

          {saved ? (
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              {saved.recipient_name}
              <br />
              {saved.street}
              {saved.suburb ? `, ${saved.suburb}` : ''}
              <br />
              {saved.city}
              {saved.province ? `, ${saved.province}` : ''} {saved.postal_code}
              <br />
              {getCountryName(saved.country)}
            </p>
          ) : (
            <AddressForm value={newAddress} onChange={setNewAddress} placesEnabled={placesEnabled} />
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Billing address</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sameBilling} onChange={(e) => setSameBilling(e.target.checked)} />
            Same as delivery address
          </label>
          {!sameBilling && (
            <AddressForm
              value={billing}
              onChange={setBilling}
              placesEnabled={placesEnabled}
              namePrefix="billing_"
              showPhone={false}
            />
          )}
        </section>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Order notes (optional)"
          rows={2}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />

        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full rounded-full" disabled={loading}>
          {loading ? 'Redirecting to PayFast…' : 'Pay now with PayFast'}
        </Button>
      </div>

      <aside className="h-fit rounded-2xl bg-muted p-5">
        <h2 className="mb-4 font-semibold">Order summary</h2>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 text-sm">
              <ProductImage src={i.image} alt={i.name} className="h-12 w-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">
                  {i.variantName ? `${i.variantName} · ` : ''}Qty {i.quantity}
                </p>
              </div>
              <p>{formatZAR(i.lineCents)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatZAR(subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping to {getCountryName(delivery.country)}</span>
            <span>{shippingCents === 0 ? 'Free' : formatZAR(shippingCents)}</span>
          </div>
          <div className="flex justify-between pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatZAR(totalCents)}</span>
          </div>
        </div>

        {international && (
          <p className="mt-4 text-xs text-muted-foreground">
            Prices are in South African rand (ZAR). Your bank converts the amount when you pay. Customs duties or
            import taxes in your country may apply on delivery.
          </p>
        )}
      </aside>
    </form>
  )
}
