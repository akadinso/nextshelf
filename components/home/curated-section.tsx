import Link from 'next/link'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/types'

export const TABS = [
  { id: 'for-you', label: 'For You' },
  { id: 'new', label: 'New arrivals' },
  { id: 'sale', label: 'On sale' },
  { id: 'under-300', label: 'Under R300' },
]

export default function CuratedSection({
  activeTab,
  products,
  favouriteIds,
}: {
  activeTab: string
  products: Product[]
  favouriteIds: string[]
}) {
  const redirectTo = activeTab === 'for-you' ? '/' : `/?tab=${activeTab}`

  return (
    <section id="curated" className="mx-auto max-w-7xl scroll-mt-40 px-4 py-14">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Curated for You</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Hand-picked products and the latest arrivals, all in one place.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === 'for-you' ? '/#curated' : `/?tab=${t.id}#curated`}
              scroll={false}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                t.id === activeTab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Nothing here yet. Check back soon.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} isFavourite={favouriteIds.includes(p.id)} redirectTo={redirectTo} />
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/products" className="text-sm font-medium text-primary hover:underline">
          View all products →
        </Link>
      </div>
    </section>
  )
}
