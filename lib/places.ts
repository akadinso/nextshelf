import { PROVINCES } from '@/lib/provinces'

// Google Places API (New) address component, as returned by places/{id}
export type PlaceComponent = { longText?: string; shortText?: string; types?: string[] }

export const isPlacesEnabled = () => Boolean(process.env.GOOGLE_MAPS_API_KEY)

// Turns Google's address components into our address fields.
export function parseAddressComponents(components: PlaceComponent[], formatted = '') {
  const find = (...types: string[]) => components.find((c) => types.some((t) => c.types?.includes(t)))
  const long = (...types: string[]) => find(...types)?.longText ?? ''

  const streetNumber = long('street_number')
  const route = long('route')

  // Google's first formatted line is already in the local order ("Hauptstrasse 12" vs "12 Main Rd")
  const firstLine = formatted.split(',')[0]?.trim() ?? ''
  let street: string
  if (route && firstLine.includes(route) && (!streetNumber || firstLine.includes(streetNumber))) {
    street = firstLine
  } else if (route) {
    // The formatted line abbreviates the road ("Rd", "Str."), so build it ourselves,
    // but keep the number on the same side as Google's local format puts it.
    const numberAfter =
      !!streetNumber && firstLine.endsWith(streetNumber) && !firstLine.startsWith(streetNumber)
    street = (numberAfter ? [route, streetNumber] : [streetNumber, route]).filter(Boolean).join(' ')
  } else {
    street = long('premise') || firstLine
  }

  const country = find('country')?.shortText ?? ''
  let province = long('administrative_area_level_1')
  if (country === 'ZA') {
    province = PROVINCES.find((p) => p.toLowerCase() === province.toLowerCase()) ?? ''
  }

  return {
    street,
    suburb: long('sublocality_level_1', 'sublocality', 'neighborhood'),
    city: long('locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_3'),
    province,
    postal_code: long('postal_code'),
    country,
  }
}
