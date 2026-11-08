import Hero from '@/components/home/hero'
import CuratedSection, { TABS } from '@/components/home/curated-section'
import CategoryTiles, { type Tile } from '@/components/home/category-tiles'
import Testimonials, { type Testimonial } from '@/components/home/testimonials'
import Faq from '@/components/home/faq'
import { createClient } from '@/lib/supabase/server'
import { CARD_SELECT, getFavouriteIds } from '@/lib/data'
import type { Category, Product } from '@/lib/types'

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const active = TABS.find((t) => t.id === tab)?.id ?? 'for-you'
  const supabase = await createClient()

  let tabQuery = supabase.from('products').select(CARD_SELECT).eq('is_active', true)
  if (active === 'for-you') {
    tabQuery = tabQuery.order('is_featured', { ascending: false }).order('created_at', { ascending: false })
  } else if (active === 'sale') {
    tabQuery = tabQuery.not('compare_at_price_cents', 'is', null).order('created_at', { ascending: false })
  } else if (active === 'under-300') {
    tabQuery = tabQuery.lte('price_cents', 30000).order('created_at', { ascending: false })
  } else {
    tabQuery = tabQuery.order('created_at', { ascending: false })
  }

  const [tabRes, featuredRes, catRes, prodRes, reviewRes, favouriteIds] = await Promise.all([
    tabQuery.limit(24),
    supabase
      .from('products')
      .select('name, images')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('categories').select('id, name, slug, parent_id').order('sort_order'),
    supabase.from('products').select('category_id, images').eq('is_active', true).limit(500),
    supabase
      .from('reviews')
      .select('id, author_name, rating, body, product:products(name, slug)')
      .gte('rating', 4)
      .not('body', 'is', null)
      .order('created_at', { ascending: false })
      .limit(8),
    getFavouriteIds(),
  ])

  // "On sale" needs a column-to-column comparison, which we do here
  let products = (tabRes.data ?? []) as unknown as Product[]
  if (active === 'sale') {
    products = products.filter((p) => p.compare_at_price_cents! > p.price_cents)
  }
  products = products.slice(0, 8)

  // Hero image: first featured product that has a photo
  const heroProduct = ((featuredRes.data ?? []) as { name: string; images: string[] }[]).find(
    (p) => p.images?.length > 0
  )

  // Category tiles: product count + a representative image per top-level category
  const categories = (catRes.data ?? []) as Category[]
  const productRows = (prodRes.data ?? []) as { category_id: string | null; images: string[] }[]
  const tiles: Tile[] = categories
    .filter((c) => !c.parent_id)
    .map((c) => {
      const ids = new Set([c.id, ...categories.filter((x) => x.parent_id === c.id).map((x) => x.id)])
      const inCat = productRows.filter((p) => p.category_id && ids.has(p.category_id))
      return {
        slug: c.slug,
        name: c.name,
        count: inCat.length,
        image: inCat.find((p) => p.images?.length > 0)?.images[0],
      }
    })
    .filter((t) => t.count > 0)

  const reviews = (reviewRes.data ?? []) as unknown as Testimonial[]

  return (
    <>
      <Hero image={heroProduct?.images[0]} alt={heroProduct?.name} />
      <CuratedSection activeTab={active} products={products} favouriteIds={favouriteIds} />
      <CategoryTiles tiles={tiles} />
      <Testimonials reviews={reviews} />
      <Faq />
    </>
  )
}
