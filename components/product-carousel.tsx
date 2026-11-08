import Link from 'next/link'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/types'

// Pure CSS scroll-snap carousel, no JS needed
export default function ProductCarousel({
  title,
  products,
  favouriteIds,
  href,
}: {
  title: string
  products: Product[]
  favouriteIds: string[]
  href?: string
}) {
  if (products.length === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        {href && (
          <Link href={href} className="text-sm text-muted-foreground hover:underline">
            View all
          </Link>
        )}
      </div>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2">
        {products.map((p) => (
          <div key={p.id} className="w-44 shrink-0 snap-start sm:w-56">
            <ProductCard product={p} isFavourite={favouriteIds.includes(p.id)} redirectTo="/" />
          </div>
        ))}
      </div>
    </section>
  )
}
