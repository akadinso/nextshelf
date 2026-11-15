import { isCountryCode } from '@/lib/countries'
import { isValidPhone } from '@/lib/phone'
import { PROVINCES } from '@/lib/provinces'
import { canShipTo } from '@/lib/shipping'

export type AddressInput = {
  recipient_name: string
  phone: string
  street: string
  suburb: string
  city: string
  province: string // province / state / region
  postal_code: string
  country: string // ISO 3166-1 alpha-2
}

export const EMPTY_ADDRESS: AddressInput = {
  recipient_name: '',
  phone: '',
  street: '',
  suburb: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'ZA',
}

// A few countries that do not use postcodes everywhere
export const NO_POSTCODE = new Set(['AE', 'QA', 'HK', 'AO', 'BS', 'BZ', 'GH', 'FJ', 'KI', 'TV', 'WS'])

type Result = { ok: true; value: AddressInput } | { ok: false; error: string }

// Shared by the checkout form (client) and the server routes, so the rules cannot drift apart.
export function validateAddress(
  input: Partial<AddressInput>,
  opts: { requirePhone?: boolean; checkShipping?: boolean } = {}
): Result {
  const v: AddressInput = {
    recipient_name: String(input.recipient_name ?? '').trim().slice(0, 100),
    phone: String(input.phone ?? '').trim().slice(0, 30),
    street: String(input.street ?? '').trim().slice(0, 150),
    suburb: String(input.suburb ?? '').trim().slice(0, 100),
    city: String(input.city ?? '').trim().slice(0, 100),
    province: String(input.province ?? '').trim().slice(0, 100),
    postal_code: String(input.postal_code ?? '').trim().slice(0, 20),
    country: String(input.country ?? '').trim().toUpperCase(),
  }

  if (!isCountryCode(v.country)) return { ok: false, error: 'Please choose a country.' }
  if (opts.checkShipping && !canShipTo(v.country)) {
    return { ok: false, error: 'Sorry, we cannot deliver to that country.' }
  }
  if (v.recipient_name.length < 2) return { ok: false, error: 'Please enter the full name.' }
  if (v.street.length < 3) return { ok: false, error: 'Please enter the street address.' }
  if (v.city.length < 2) return { ok: false, error: 'Please enter the city.' }
  if (v.country === 'ZA' && !PROVINCES.includes(v.province)) {
    return { ok: false, error: 'Please choose a province.' }
  }
  if (!v.postal_code && !NO_POSTCODE.has(v.country)) {
    return { ok: false, error: 'Please enter the postal code.' }
  }
  if (opts.requirePhone && !isValidPhone(v.phone)) {
    return { ok: false, error: 'Please enter a valid phone number, for example +27 82 123 4567.' }
  }
  if (v.phone && !isValidPhone(v.phone)) {
    return { ok: false, error: 'That phone number does not look right.' }
  }
  return { ok: true, value: v }
}
