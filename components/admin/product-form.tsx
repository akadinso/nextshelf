import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Category, Product } from '@/lib/types'

// Server component: pass a server action as `action`
export default function ProductForm({
  action,
  categories,
  product,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>
  categories: Category[]
  product?: Product
  submitLabel: string
}) {
  const rands = (cents?: number | null) => (cents == null ? '' : (cents / 100).toFixed(2))

  return (
    <form action={action} className="space-y-4">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div className="space-y-1">
        <label className="text-sm font-medium">Name *</label>
        <Input name="name" defaultValue={product?.name} required />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Description</label>
        <textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ''}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Price (R) *</label>
          <Input name="price" type="number" step="0.01" min="0" defaultValue={rands(product?.price_cents)} required />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Was price (R)</label>
          <Input
            name="compare_at"
            type="number"
            step="0.01"
            min="0"
            defaultValue={rands(product?.compare_at_price_cents)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Stock</label>
          <Input name="stock" type="number" min="0" defaultValue={product?.stock_quantity ?? 0} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">SKU</label>
          <Input name="sku" defaultValue={product?.sku ?? ''} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Category</label>
          <select
            name="category_id"
            defaultValue={product?.category_id ?? ''}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? '— ' : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} />
          Active (visible in shop)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} />
          Featured (Recommended carousel)
        </label>
      </div>

      {product && product.images.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Current images (tick to remove)</label>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {product.images.map((src) => (
              <label key={src} className="block text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-square w-full rounded-md border object-cover" />
                <span className="mt-1 flex items-center gap-1">
                  <input type="checkbox" name="remove_image" value={src} /> Remove
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">{product ? 'Add images' : 'Images'} (max 5 MB each)</label>
        <input type="file" name="images" accept="image/*" multiple className="block w-full text-sm" />
      </div>

      <Button type="submit">{submitLabel}</Button>
    </form>
  )
}
