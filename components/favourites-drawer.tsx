'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Heart, X } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import ProductImage from '@/components/product-image'
import { toggleFavourite } from '@/app/actions/favourites'
import { formatZAR } from '@/lib/format'
import type { Product } from '@/lib/types'

export default function FavouritesDrawer({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open favourites"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
        >
          <Heart className="h-5 w-5" />
          {products.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {products.length}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Favourites ({products.length})</SheetTitle>
        </SheetHeader>

        {products.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">Tap the heart on a product to save it here.</p>
        ) : (
          <ul className="flex-1 space-y-4 overflow-y-auto px-4">
            {products.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <ProductImage src={p.images[0]} alt={p.name} className="h-16 w-16 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${p.slug}`}
                    onClick={() => setOpen(false)}
                    className="line-clamp-1 text-sm font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-sm">{formatZAR(p.price_cents)}</p>
                </div>
                <form action={toggleFavourite}>
                  <input type="hidden" name="productId" value={p.id} />
                  <input type="hidden" name="redirectTo" value="/" />
                  <button className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                    <X className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
