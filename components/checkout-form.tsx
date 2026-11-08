'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PROVINCES } from '@/lib/provinces'
import type { Address } from '@/lib/types'

export default function CheckoutForm({
  addresses,
  defaultName,
  defaultPhone,
}: {
  addresses: Address[]
  defaultName: string
  defaultPhone: string
}) {
  const [addressId, setAddressId] = useState(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? 'new'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)

    let address: Record<string, string | null>
    if (addressId !== 'new') {
      const a = addresses.find((x) => x.id === addressId)!
      address = {
        recipient_name: a.recipient_name,
        phone: a.phone,
        street: a.street,
        suburb: a.suburb,
        city: a.city,
        province: a.province,
        postal_code: a.postal_code,
      }
    } else {
      address = Object.fromEntries(
        ['recipient_name', 'phone', 'street', 'suburb', 'city', 'province', 'postal_code'].map((k) => [
          k,
          String(fd.get(k) ?? ''),
        ])
      )
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, notes: String(fd.get('notes') ?? '') }),
      })
      const json = await res.json().catch(() => ({}))
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
    <form onSubmit={onSubmit} className="space-y-5">
      <h2 className="text-lg font-semibold">Delivery address</h2>

      {addresses.length > 0 && (
        <select
          value={addressId}
          onChange={(e) => setAddressId(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label ? `${a.label}: ` : ''}
              {a.street}, {a.city}
            </option>
          ))}
          <option value="new">+ Use a new address</option>
        </select>
      )}

      {addressId === 'new' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="recipient_name" placeholder="Full name *" defaultValue={defaultName} required />
          <Input name="phone" placeholder="Phone" defaultValue={defaultPhone} />
          <Input name="street" placeholder="Street address *" className="sm:col-span-2" required />
          <Input name="suburb" placeholder="Suburb" />
          <Input name="city" placeholder="City *" required />
          <select
            name="province"
            required
            defaultValue=""
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Province *
            </option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Input name="postal_code" placeholder="Postal code *" required />
        </div>
      )}

      <textarea
        name="notes"
        placeholder="Order notes (optional)"
        rows={2}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />

      {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Redirecting to PayFast…' : 'Pay now with PayFast'}
      </Button>
    </form>
  )
}
