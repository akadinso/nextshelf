import ProductForm from '@/components/admin/product-form'
import { createProduct } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('id, name, slug, parent_id').order('sort_order')

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Add product</h1>
      {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <ProductForm action={createProduct} categories={(data ?? []) as Category[]} submitLabel="Create product" />
      <p className="mt-4 text-sm text-muted-foreground">
        You can add sizes / colours (variants) after the product is created.
      </p>
    </div>
  )
}
