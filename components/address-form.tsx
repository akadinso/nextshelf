'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NO_POSTCODE, type AddressInput } from '@/lib/address'
import { PROVINCES } from '@/lib/provinces'
import { canShipTo, shippableCountries } from '@/lib/shipping'

type Suggestion = { placeId: string; main: string; secondary: string }

export default function AddressForm({
  value,
  onChange,
  placesEnabled,
  namePrefix = '',
  showPhone = true,
}: {
  value: AddressInput
  onChange: (v: AddressInput) => void
  placesEnabled: boolean
  namePrefix?: string // lets a plain <form action={...}> read the fields by name
  showPhone?: boolean
}) {
  const countries = useMemo(() => shippableCountries(), [])
  const latest = useRef(value)
  latest.current = value

  const [q, setQ] = useState('')
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [notice, setNotice] = useState('')
  const session = useRef('')
  const n = (field: string) => `${namePrefix}${field}`

  const set = (field: keyof AddressInput, v: string) => onChange({ ...latest.current, [field]: v })

  // Debounced address search
  useEffect(() => {
    if (!placesEnabled || q.trim().length < 3) {
      setItems([])
      return
    }
    if (!session.current) session.current = crypto.randomUUID()
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ input: q, country: latest.current.country, session: session.current })
        const res = await fetch(`/api/places/autocomplete?${params}`, { signal: ctrl.signal })
        if (!res.ok) return setItems([])
        const json = (await res.json()) as { suggestions?: Suggestion[] }
        setItems(json.suggestions ?? [])
        setOpen(true)
        setActive(-1)
      } catch {
        /* aborted or offline: keep typing by hand */
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [q, placesEnabled])

  async function pick(s: Suggestion) {
    setOpen(false)
    setItems([])
    setQ('')
    setNotice('')
    try {
      const params = new URLSearchParams({ placeId: s.placeId, session: session.current })
      const res = await fetch(`/api/places/details?${params}`)
      session.current = '' // a new search session starts after each pick
      if (!res.ok) return setNotice('Could not load that address. Please type it in.')
      const a = (await res.json()) as Partial<AddressInput>
      if (a.country && !canShipTo(a.country)) return setNotice('Sorry, we cannot deliver to that country.')
      onChange({
        ...latest.current,
        street: a.street || latest.current.street,
        suburb: a.suburb ?? '',
        city: a.city ?? '',
        province: a.province ?? '',
        postal_code: a.postal_code ?? '',
        country: a.country || latest.current.country,
      })
    } catch {
      setNotice('Could not load that address. Please type it in.')
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      pick(items[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const isZA = value.country === 'ZA'
  const postcodeOptional = NO_POSTCODE.has(value.country)

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium">Country *</label>
        <select
          name={n('country')}
          value={value.country}
          onChange={(e) => onChange({ ...latest.current, country: e.target.value, province: '' })}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {placesEnabled && (
        <div className="relative">
          <label className="text-xs font-medium">Find your address</label>
          <div className="relative mt-1">
            <MapPin className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => items.length > 0 && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Start typing your street address"
              autoComplete="off"
              className="pl-9"
            />
          </div>
          {open && items.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-background shadow-lg">
              {items.map((s, i) => (
                <li
                  key={s.placeId}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pick(s)
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-muted' : ''}`}
                >
                  <span className="font-medium">{s.main}</span>{' '}
                  <span className="text-muted-foreground">{s.secondary}</span>
                </li>
              ))}
              <li className="border-t px-3 py-1 text-right text-[10px] text-muted-foreground">Powered by Google</li>
            </ul>
          )}
          {notice && <p className="mt-1 text-xs text-destructive">{notice}</p>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          name={n('recipient_name')}
          placeholder="Full name *"
          value={value.recipient_name}
          onChange={(e) => set('recipient_name', e.target.value)}
          autoComplete="name"
        />
        {showPhone ? (
          <Input
            name={n('phone')}
            type="tel"
            placeholder="Phone, e.g. +27 82 123 4567"
            value={value.phone}
            onChange={(e) => set('phone', e.target.value)}
            autoComplete="tel"
          />
        ) : (
          <div className="hidden sm:block" />
        )}
        <Input
          name={n('street')}
          placeholder="Street address *"
          value={value.street}
          onChange={(e) => set('street', e.target.value)}
          className="sm:col-span-2"
          autoComplete="address-line1"
        />
        <Input
          name={n('suburb')}
          placeholder="Suburb / district"
          value={value.suburb}
          onChange={(e) => set('suburb', e.target.value)}
        />
        <Input
          name={n('city')}
          placeholder="City *"
          value={value.city}
          onChange={(e) => set('city', e.target.value)}
          autoComplete="address-level2"
        />
        {isZA ? (
          <select
            name={n('province')}
            value={value.province}
            onChange={(e) => set('province', e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Province *</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <Input
            name={n('province')}
            placeholder="State / province / region"
            value={value.province}
            onChange={(e) => set('province', e.target.value)}
            autoComplete="address-level1"
          />
        )}
        <Input
          name={n('postal_code')}
          placeholder={postcodeOptional ? 'Postal code (optional)' : 'Postal code *'}
          value={value.postal_code}
          onChange={(e) => set('postal_code', e.target.value)}
          autoComplete="postal-code"
        />
      </div>
    </div>
  )
}
