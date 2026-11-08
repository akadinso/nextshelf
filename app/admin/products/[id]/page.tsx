import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import ProductForm from '@/components/admin/product-form'
import { addVariant, deleteVariant, updateProduct, updateVariant } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import type { Category, Product, Variant } from '@/lib/types'

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { id } = await params
  const { saved, error } = await searchParams
  const supabase = await createClient()

  const [{ data: product }, { data: variantData }, { data: catData }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('product_variants').select('*').eq('product_id', id).order('name'),
    supabase.from('categories').select('id, name, slug, parent_id').order('sort_order'),
  ])
  if (!product) notFound()
  const variants = (variantData ?? []) as Variant[]

  return (
    <div className="max-w-2xl space-y-12">
      <div>
        <Link href="/admin/products" className="text-sm text-muted-foreground hover:underline">
          ← All products
        </Link>
        <h1 className="mt-1 mb-6 text-2xl font-bold">Edit product</h1>
        {saved && <p className="mb-4 rounded-md bg-muted p-3 text-sm">Saved.</p>}
        {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <ProductForm
          action={updateProduct}
          categories={(catData ?? []) as Category[]}
          product={product as Product}
          submitLabel="Save changes"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          To remove a product from the shop, untick “Active” rather than deleting it, so old orders keep their history.
        </p>
      </div>

      <section>
        <h2 className="mb-1 text-lg font-semibold">Variants (sizes, colours…)</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          If you add variants, customers must pick one and stock is tracked per variant. Leave the price empty to
          use the product price.
        </p>

        <ul className="space-y-2">
          {variants.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
              <span className="min-w-24 flex-1 font-medium">{v.name}</span>
              <form action={updateVariant} className="flex items-center gap-2">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="productId" value={id} />
                <Input name="stock" type="number" min="0" defaultValue={v.stock_quantity} className="w-20" />
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  defaultValue={v.price_cents == null ? '' : (v.price_cents / 100).toFixed(2)}
                  className="w-24"
                />
                <Button type="submit" variant="outline" size="sm">
                  Save
                </Button>
              </form>
              <form action={deleteVariant}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="productId" value={id} />
                <Button type="submit" variant="outline" size="sm">
                  Delete
                </Button>
              </form>
            </li>
          ))}
          {variants.length === 0 && <li className="text-sm text-muted-foreground">No variants.</li>}
        </ul>

        <form action={addVariant} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="productId" value={id} />
          <div className="space-y-1">
            <label className="text-xs font-medium">Name</label>
            <Input name="name" placeholder="Large / Black" required className="w-44" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Stock</label>
            <Input name="stock" type="number" min="0" defaultValue={0} className="w-20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Price (R, optional)</label>
            <Input name="price" type="number" step="0.01" min="0" className="w-28" />
          </div>
          <Button type="submit">Add variant</Button>
        </form>
      </section>
    </div>
  )
}
