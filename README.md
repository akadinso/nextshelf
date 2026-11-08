# ClearCurrent (project folder: nextshelf)

Next.js (App Router) + Supabase + PayFast. Single-seller ecommerce store.

## Setup
1. `npx create-next-app@latest nextshelf` (TypeScript, Tailwind, App Router), then `npx shadcn@latest init`
2. `npx shadcn@latest add button input sheet badge`
3. `npm i @supabase/supabase-js @supabase/ssr server-only`
4. Copy this folder's contents over your project (replace `app/layout.tsx`, `app/page.tsx`, `next.config.ts`)
5. Copy `.env.example` to `.env.local` and fill it in
6. Supabase SQL editor: run `supabase/migrations/001_schema.sql`, `002_checkout.sql`, then `003_reviews.sql`, then `004_tags.sql`. Sample catalogue (17 water and cooling products): `supabase/seed.sql` and, after you have signed up, `supabase/seed_reviews.sql` (demo reviews, delete before launch)
7. Supabase Storage: create a **public** bucket named `product-images`
8. Supabase Auth > URL Configuration: add `http://localhost:3000/auth/callback` (and your live domain) as a redirect URL
9. `npm run dev`, sign up, then in the SQL editor: `update profiles set role = 'admin' where id = '<your auth user id>';`
10. Go to `/admin`, add categories, then products

## Notes
- Webhook testing: PayFast cannot reach localhost. Use ngrok and set `NEXT_PUBLIC_SITE_URL` to the ngrok URL.
- On Next.js 16, `middleware.ts` still works but shows a deprecation warning. To silence it, rename to `proxy.ts` and rename the exported function `middleware` to `proxy`.
- Shipping cost lives in `lib/shipping.ts`.

- Storefront text (hero, FAQ, top bar links, contact email) lives in `lib/site.ts`. Colours live in `app/theme.css`.
- Shop name: change `name` in `lib/site.ts` and it updates everywhere. See `docs/SOURCING.md` for the product list, supplier search terms and compliance notes.
