import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import FilterDrawer from '@/components/filter-drawer'
import ProductCard from '@/components/product-card'
import { createClient } from '@/lib/supabase/server'
import { CARD_SELECT, getFavouriteIds } from '@/lib/data'
import type { Category, Product } from '@/lib/types'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: catData } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .order('sort_order')
  const categories = (catData ?? []) as Category[]

  let query = supabase.from('products').select(CARD_SELECT).eq('is_active', true)

  if (sp.q) query = query.ilike('name', `%${sp.q}%`)

  const cat = categories.find((c) => c.slug === sp.category)
  if (cat) {
    const ids = [cat.id, ...categories.filter((c) => c.parent_id === cat.id).map((c) => c.id)]
    query = query.in('category_id', ids)
  }

  const min = parseFloat(sp.min ?? '')
  const max = parseFloat(sp.max ?? '')
  if (!Number.isNaN(min)) query = query.gte('price_cents', Math.round(min * 100))
  if (!Number.isNaN(max)) query = query.lte('price_cents', Math.round(max * 100))

  if (sp.sort === 'price_asc') query = query.order('price_cents', { ascending: true })
  else if (sp.sort === 'price_desc') query = query.order('price_cents', { ascending: false })
  else query = query.order('created_at', { ascending: false })

  const [{ data }, favouriteIds] = await Promise.all([query, getFavouriteIds()])
  const products = (data ?? []) as unknown as Product[]

  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()
  const redirectTo = `/products${qs ? `?${qs}` : ''}`

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{cat ? cat.name : 'All products'}</h1>

        <form action="/products" className="flex gap-2">
          <Input name="q" placeholder="Search products" defaultValue={sp.q} className="w-48 sm:w-64" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <FilterDrawer categories={categories} defaults={sp} />
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p>No products match your filters.</p>
          <Link href="/products" className="mt-2 inline-block text-sm underline">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} isFavourite={favouriteIds.includes(p.id)} redirectTo={redirectTo} />
          ))}
        </div>
      )}
    </div>
  )
}
