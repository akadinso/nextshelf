import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin
  } catch {
    return 'https://*.supabase.co'
  }
})()

// Content Security Policy. Next.js needs inline scripts and styles, so 'unsafe-inline' stays,
// but everything else is locked to your own site, Supabase, and https images.
// If a page ever looks broken after deploying, set CSP_MODE=report-only to test without blocking.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co wss://*.supabase.co`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // admin product image uploads go through a server action
    serverActions: { bodySizeLimit: '10mb' },
  },
  async headers() {
    const always = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ]
    // The dev server needs eval for hot reload, so CSP and HSTS apply to production only
    const production = isProd
      ? [
          {
            key: process.env.CSP_MODE === 'report-only' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
            value: csp,
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ]
      : []
    return [{ source: '/(.*)', headers: [...always, ...production] }]
  },
}

export default nextConfig
