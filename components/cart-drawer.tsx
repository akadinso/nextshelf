'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import ProductImage from '@/components/product-image'
import { removeFromCart, updateCartQty } from '@/app/actions/cart'
import { cartSubtotalCents, unitPriceCents } from '@/lib/cart'
import { formatZAR } from '@/lib/format'
import type { CartItem } from '@/lib/types'

export default function CartDrawer({ items }: { items: CartItem[] }) {
  const [open, setOpen] = useState(false)
  const count = items.reduce((n, i) => n + i.quantity, 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open cart"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
        >
          <ShoppingBag className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart ({count})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="px-4 text-sm text-muted-foreground">Your cart is empty.</p>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <ProductImage
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="h-16 w-16 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${item.product.slug}`}
                      onClick={() => setOpen(false)}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && <p className="text-xs text-muted-foreground">{item.variant.name}</p>}
                    <p className="text-sm">{formatZAR(unitPriceCents(item))}</p>

                    <div className="mt-1 flex items-center gap-2">
                      <form action={updateCartQty}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="quantity" value={item.quantity - 1} />
                        <button className="flex h-6 w-6 items-center justify-center rounded border" aria-label="Decrease">
                          <Minus className="h-3 w-3" />
                        </button>
                      </form>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <form action={updateCartQty}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="quantity" value={item.quantity + 1} />
                        <button className="flex h-6 w-6 items-center justify-center rounded border" aria-label="Increase">
                          <Plus className="h-3 w-3" />
                        </button>
                      </form>
                      <form action={removeFromCart} className="ml-auto">
                        <input type="hidden" name="itemId" value={item.id} />
                        <button className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t p-4">
              <div className="flex justify-between text-sm font-medium">
                <span>Subtotal</span>
                <span>{formatZAR(cartSubtotalCents(items))}</span>
              </div>
              <Button asChild className="w-full">
                <Link href="/checkout" onClick={() => setOpen(false)}>
                  Checkout
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
