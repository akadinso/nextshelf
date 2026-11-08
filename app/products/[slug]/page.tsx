import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Heart, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProductImage from '@/components/product-image'
import ReviewsSection from '@/components/reviews-section'
import { addToCart } from '@/app/actions/cart'
import { toggleFavourite } from '@/app/actions/favourites'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { getFavouriteIds } from '@/lib/data'
import { formatZAR } from '@/lib/format'
import type { Product, Review, Variant } from '@/lib/types'

type Full = Product & { variants: Variant[]; category: { name: string; slug: string } | null }

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ review?: string }>
}) {
  const { slug } = await params
  const { review: reviewStatus } = await searchParams
  const supabase = await createClient()

  const { data } = await supabase
    .from('products')
    .select('*, variants:product_variants(*), category:categories(name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) notFound()
  const product = data as unknown as Full

  const user = await getUser()
  const [favouriteIds, reviewRes, purchasedRes] = await Promise.all([
    getFavouriteIds(),
    supabase
      .from('reviews')
      .select('id, user_id, author_name, rating, body, created_at')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(30),
    user ? supabase.rpc('has_purchased', { p_product: product.id }) : Promise.resolve({ data: false }),
  ])
  const isFavourite = favouriteIds.includes(product.id)
  const reviews = (reviewRes.data ?? []) as Review[]
  const canReview = purchasedRes.data === true

  const variants = [...product.variants].sort((a, b) => a.name.localeCompare(b.name))
  const hasVariants = variants.length > 0
  const inStock = hasVariants ? variants.some((v) => v.stock_quantity > 0) : product.stock_quantity > 0
  const onSale =
    product.compare_at_price_cents != null && product.compare_at_price_cents > product.price_cents
  const here = `/products/${product.slug}`

  return (
    <>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
            <ProductImage src={product.images[0]} alt={product.name} className="h-full w-full" />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.slice(1).map((src) => (
                <div key={src} className="aspect-square overflow-hidden rounded-xl bg-muted">
                  <ProductImage src={src} alt={product.name} className="h-full w-full" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{product.name}</h1>

          <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {product.rating_count > 0 ? (
              <>
                <span className="font-medium">{Number(product.rating_avg).toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({product.rating_count} {product.rating_count === 1 ? 'review' : 'reviews'})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">No reviews yet</span>
            )}
          </a>

          <p className="mt-4 text-3xl font-semibold">
            {formatZAR(product.price_cents)}
            {onSale && (
              <span className="ml-3 text-base font-normal text-muted-foreground line-through">
                {formatZAR(product.compare_at_price_cents!)}
              </span>
            )}
          </p>

          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{product.description}</p>
          )}

          <form action={addToCart} className="mt-6 space-y-4">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="redirectTo" value={here} />

            {hasVariants && (
              <div className="space-y-1">
                <label htmlFor="variantId" className="text-sm font-medium">
                  Option
                </label>
                <select
                  id="variantId"
                  name="variantId"
                  required
                  defaultValue=""
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.stock_quantity < 1}>
                      {v.name}
                      {v.price_cents != null && v.price_cents !== product.price_cents ? ` · ${formatZAR(v.price_cents)}` : ''}
                      {v.stock_quantity < 1 ? ' (sold out)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Input name="quantity" type="number" min={1} defaultValue={1} className="h-11 w-20" />
              <Button type="submit" size="lg" className="flex-1 rounded-full" disabled={!inStock}>
                {inStock ? 'Add to cart' : 'Out of stock'}
              </Button>
            </div>
          </form>

          <form action={toggleFavourite} className="mt-3">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="redirectTo" value={here} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Heart className={`h-4 w-4 ${isFavourite ? 'fill-red-500 text-red-500' : ''}`} />
              {isFavourite ? 'Saved to favourites' : 'Save to favourites'}
            </button>
          </form>
        </div>
      </div>

      <ReviewsSection
        productId={product.id}
        slug={product.slug}
        reviews={reviews}
        average={product.rating_avg}
        count={product.rating_count}
        userId={user?.id ?? null}
        canReview={canReview}
        status={reviewStatus}
      />
    </>
  )
}
