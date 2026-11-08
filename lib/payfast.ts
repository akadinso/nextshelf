import 'server-only'
import crypto from 'crypto'
import { SITE } from '@/lib/site'

const sandbox = process.env.PAYFAST_SANDBOX === 'true'
const host = sandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za'

export const PAYFAST_PROCESS_URL = `${host}/eng/process`
export const PAYFAST_VALIDATE_URL = `${host}/eng/query/validate`

type Pairs = [string, string][]

// PayFast expects PHP-style urlencode: spaces as "+", uppercase hex, and !'()*~ encoded
const enc = (v: string) =>
  encodeURIComponent(v.trim())
    .replace(/[!'()*~]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%20/g, '+')

// Blank values are excluded; order must be preserved
export function pfParamString(pairs: Pairs) {
  return pairs
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${enc(v)}`)
    .join('&')
}

export function pfSignature(pairs: Pairs, passphrase = process.env.PAYFAST_PASSPHRASE) {
  let str = pfParamString(pairs)
  if (passphrase) str += `&passphrase=${enc(passphrase)}`
  return crypto.createHash('md5').update(str).digest('hex')
}

export function buildPayfastUrl(order: {
  id: string
  order_number: number
  total_cents: number
  email: string
  recipient_name: string
  phone?: string
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL!
  const [first, ...rest] = order.recipient_name.trim().split(/\s+/)

  // Field order matters for the signature
  const pairs: Pairs = [
    ['merchant_id', process.env.PAYFAST_MERCHANT_ID!],
    ['merchant_key', process.env.PAYFAST_MERCHANT_KEY!],
    ['return_url', `${site}/checkout/success?order=${order.id}`],
    ['cancel_url', `${site}/checkout/cancelled?order=${order.id}`],
    ['notify_url', `${site}/api/payfast/notify`],
    ['name_first', first ?? ''],
    ['name_last', rest.join(' ')],
    ['email_address', order.email],
    ['cell_number', order.phone ?? ''],
    ['m_payment_id', order.id],
    ['amount', (order.total_cents / 100).toFixed(2)],
    ['item_name', `${SITE.name} order #${order.order_number}`],
  ]

  const clean = pairs.filter(([, v]) => v !== '')
  return `${PAYFAST_PROCESS_URL}?${pfParamString(clean)}&signature=${pfSignature(clean)}`
}
