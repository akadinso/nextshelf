import Link from 'next/link'
import ProductImage from '@/components/product-image'

export type Tile = { slug: string; name: string; count: number; image?: string }

export default function CategoryTiles({ tiles }: { tiles: Tile[] }) {
  if (tiles.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Shop by category</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Find exactly what you are looking for.</p>
      </div>

      <div className="mt-8 grid gap-4 md:auto-rows-[15rem] md:grid-cols-3">
        {tiles.slice(0, 4).map((t, i) => {
          const featured = i === 0
          return (
            <Link
              key={t.slug}
              href={`/products?category=${t.slug}`}
              className={`group relative flex min-h-48 overflow-hidden rounded-3xl p-6 ${
                featured ? 'bg-primary text-primary-foreground md:row-span-2' : 'bg-muted'
              } ${tiles.length >= 4 && i === 3 ? 'md:col-span-2' : ''}`}
            >
              <div className="relative z-10 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{t.name}</h3>
                  <p className={`mt-1 text-sm ${featured ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {t.count} {t.count === 1 ? 'product' : 'products'}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-background px-4 py-1.5 text-xs font-medium text-foreground">
                  Shop now
                </span>
              </div>

              <div className="absolute -bottom-4 -right-4 h-3/5 w-3/5 rotate-3 overflow-hidden rounded-2xl bg-white shadow-lg transition-transform duration-300 group-hover:rotate-0 group-hover:scale-105 md:h-2/3">
                <ProductImage src={t.image} alt="" contain className="h-full w-full p-3" />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
