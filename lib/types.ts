export type Product = {
  id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price_cents: number
  compare_at_price_cents: number | null
  sku: string | null
  stock_quantity: number
  images: string[]
  is_active: boolean
  is_featured: boolean
  rating_avg: number
  rating_count: number
  created_at: string
  // only present when selected with CARD_SELECT
  variants?: { count: number }[]
}

export type Variant = {
  id: string
  product_id: string
  name: string
  sku: string | null
  price_cents: number | null
  stock_quantity: number
}

export type Category = { id: string; parent_id: string | null; name: string; slug: string }

export type CartItem = {
  id: string
  quantity: number
  variant_id: string | null
  product: Pick<Product, 'id' | 'name' | 'slug' | 'price_cents' | 'stock_quantity' | 'images'>
  variant: Pick<Variant, 'id' | 'name' | 'price_cents' | 'stock_quantity'> | null
}

export type Address = {
  id: string
  label: string | null
  recipient_name: string
  phone: string | null
  street: string
  suburb: string | null
  city: string
  province: string
  postal_code: string
  is_default: boolean
}

export type Order = {
  id: string
  order_number: number
  email: string
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  subtotal_cents: number
  shipping_cents: number
  total_cents: number
  shipping_address: Record<string, string>
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  name: string
  variant_name: string | null
  unit_price_cents: number
  quantity: number
}

export type Review = {
  id: string
  user_id: string
  author_name: string
  rating: number
  body: string | null
  created_at: string
}
