import Link from 'next/link'
import { Droplets, Search, Zap } from 'lucide-react'
import { getProfile, getUser } from '@/lib/auth'
import { getCart, getFavourites, getTopCategories } from '@/lib/data'
import { SITE } from '@/lib/site'
import CartDrawer from '@/components/cart-drawer'
import FavouritesDrawer from '@/components/favourites-drawer'

export default async function SiteHeader() {
  const user = await getUser()
  const [profile, cart, favourites, categories] = await Promise.all([
    user ? getProfile() : null,
    user ? getCart() : [],
    user ? getFavourites() : [],
    getTopCategories(),
  ])

  const displayName = profile?.full_name || user?.email || ''
  const initial = displayName.trim()[0]?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-40 bg-background">
      {/* Announcement bar */}
      <div className="bg-neutral-950 text-[11px] text-neutral-300">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-end gap-5 px-4">
          {profile?.role === 'admin' && (
            <Link href="/admin" className="font-medium text-white hover:underline">
              Admin
            </Link>
          )}
          {SITE.topLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main row */}
      <div className="border-b">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Droplets className="h-4 w-4" />
            </span>
            {SITE.name}
          </Link>

          <form
            action="/products"
            className="order-last flex w-full items-center rounded-full bg-muted py-1 pl-4 pr-1 md:order-none md:max-w-xl md:flex-1"
          >
            <input
              name="q"
              placeholder="Search products"
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-1">
            {user ? (
              <>
                <FavouritesDrawer products={favourites} />
                <CartDrawer items={cart} />
                <Link
                  href="/account"
                  className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-muted"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {initial}
                  </span>
                  <span className="hidden max-w-32 truncate text-sm font-medium md:inline">
                    {profile?.full_name || 'Account'}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-muted">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Category nav */}
        <nav className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto whitespace-nowrap px-4 pb-3 text-sm">
          <Link
            href={SITE.navHighlight.href}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Zap className="h-3.5 w-3.5" />
            {SITE.navHighlight.label}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="text-muted-foreground hover:text-foreground">
              {c.name}
            </Link>
          ))}
          <Link href="/products" className="ml-auto font-medium text-primary hover:underline">
            Shop all
          </Link>
        </nav>
      </div>
    </header>
  )
}
