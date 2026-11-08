export const formatZAR = (cents: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(cents / 100)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// Only allow same-site relative redirects
export const safeNext = (n: unknown) =>
  typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/'
