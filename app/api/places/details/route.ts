import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { parseAddressComponents, type PlaceComponent } from '@/lib/places'

// Turns the suggestion the customer picked into address fields.
export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ error: 'Address search is not set up.' }, { status: 501 })
  if (!(await getUser())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const placeId = params.get('placeId') ?? ''
  const session = params.get('session') ?? ''
  if (!/^[A-Za-z0-9_-]{10,400}$/.test(placeId)) {
    return NextResponse.json({ error: 'Bad place id.' }, { status: 400 })
  }

  const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`)
  if (/^[A-Za-z0-9-]{8,64}$/.test(session)) url.searchParams.set('sessionToken', session)

  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'addressComponents,formattedAddress' },
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('Places details failed', res.status, await res.text())
    return NextResponse.json({ error: 'Could not load that address.' }, { status: 502 })
  }

  const data = (await res.json()) as { addressComponents?: PlaceComponent[]; formattedAddress?: string }
  return NextResponse.json(parseAddressComponents(data.addressComponents ?? [], data.formattedAddress ?? ''))
}
