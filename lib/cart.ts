import type { CartItem } from '@/lib/types'

export const unitPriceCents = (i: CartItem) => i.variant?.price_cents ?? i.product.price_cents

export const cartSubtotalCents = (items: CartItem[]) =>
  items.reduce((sum, i) => sum + unitPriceCents(i) * i.quantity, 0)
