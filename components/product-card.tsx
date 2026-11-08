import Link from 'next/link'
import { Heart, ShoppingCart } from 'lucide-react'
import { addToCart } from '@/app/actions/cart'
import { toggleFavourite } from '@/app/actions/favourites'
import ProductImage from '@/components/product-image'
import { RatingBadge } from '@/components/star-rating'
import { formatZAR } from '@/lib/format'
import type { Product } from '@/lib/types'

export default function ProductCard({
  product,
  isFavourite,
  redirectTo = '/products',
}: {
  product: Product
  isFavourite: boolean
  redirectTo?: string
}) {
  const hasVariants = (product.variants?.[0]?.count ?? 0) > 0
  const canQuickAdd = !hasVariants && product.stock_quantity > 0
  const onSale =
    product.compare_at_price_cents != null && product.compare_at_price_cents > product.price_cents
  const discount = onSale
    ? Math.round((1 - product.price_cents / product.compare_at_price_cents!) * 100)
    : 0

  return (
    <div className="group relative rounded-2xl bg-muted p-3 transition-shadow hover:shadow-md">
      <form action={toggleFavourite} className="absolute right-5 top-5 z-10">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          aria-label={isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 hover:bg-background"
        >
          <Heart className={`h-3.5 w-3.5 ${isFavourite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
      </form>

      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-white">
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full transition-transform duration-300 group-hover:scale-105"
          />
          {onSale && (
            <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              -{discount}%
            </span>
          )}
        </div>

        <div className="mt-3 px-1 pb-1 pr-10">
          <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
          <RatingBadge value={product.rating_avg} count={product.rating_count} />
          <p className="mt-1 text-sm">
            <span className="font-semibold">{formatZAR(product.price_cents)}</span>
            {onSale && (
              <span className="ml-2 text-xs text-muted-foreground line-through">
                {formatZAR(product.compare_at_price_cents!)}
              </span>
            )}
          </p>
        </div>
      </Link>

      {canQuickAdd && (
        <form action={addToCart} className="absolute bottom-4 right-4">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="quantity" value="1" />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            aria-label={`Add ${product.name} to cart`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm hover:bg-primary hover:text-primary-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  )
}
