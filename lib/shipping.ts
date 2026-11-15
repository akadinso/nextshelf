import { COUNTRIES, type Country } from '@/lib/countries'

export const HOME_COUNTRY = 'ZA'

// TODO: replace these with your real courier rates. Amounts are in cents (ZAR).
// The international figure is a PLACEHOLDER so you never ship abroad for free by accident.
export const SHIPPING_RATES = {
  domesticCents: 0,
  internationalCents: 35000,
}

// null = deliver to every country that is not blocked. Or list the codes you serve, e.g. ['ZA', 'NA', 'BW'].
export const SHIP_TO: string[] | null = null

// Comprehensive-sanctions countries and places with no postal delivery. Review this list yourself.
export const BLOCKED_COUNTRIES = new Set(['KP', 'IR', 'SY', 'CU', 'AQ', 'BV', 'HM', 'TF', 'GS', 'UM'])

export function canShipTo(country: string) {
  if (BLOCKED_COUNTRIES.has(country)) return false
  return SHIP_TO ? SHIP_TO.includes(country) : true
}

export const shippingCentsFor = (country: string) =>
  country === HOME_COUNTRY ? SHIPPING_RATES.domesticCents : SHIPPING_RATES.internationalCents

export const shippableCountries = (): Country[] => COUNTRIES.filter((c) => canShipTo(c.code))
