import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

// Address suggestions while typing (Google Places API New). The key stays on the server,
// and only signed-in customers can call this so strangers cannot run up your Google bill.
export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) return NextResponse.json({ error: 'Address search is not set up.' }, { status: 501 })
  if (!(await getUser())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const input = (params.get('input') ?? '').trim().slice(0, 120)
  const country = (params.get('country') ?? '').toUpperCase()
  const session = params.get('session') ?? ''
  if (input.length < 3) return NextResponse.json({ suggestions: [] })

  const body: Record<string, unknown> = { input }
  if (/^[A-Z]{2}$/.test(country)) body.includedRegionCodes = [country.toLowerCase()]
  if (/^[A-Za-z0-9-]{8,64}$/.test(session)) body.sessionToken = session

  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('Places autocomplete failed', res.status, await res.text())
    return NextResponse.json({ suggestions: [] })
  }

  type Prediction = {
    placeId?: string
    text?: { text?: string }
    structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
  }
  const data = (await res.json()) as { suggestions?: { placePrediction?: Prediction }[] }

  const suggestions = (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is Prediction & { placeId: string } => !!p?.placeId)
    .slice(0, 5)
    .map((p) => ({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    }))

  return NextResponse.json({ suggestions })
}
