import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ProductImage from '@/components/product-image'
import { createClient } from '@/lib/supabase/server'
import { formatZAR } from '@/lib/format'
import type { Product } from '@/lib/types'

export default async function AdminProductsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
  const products = (data ?? []) as Product[]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products ({products.length})</h1>
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="flex items-center gap-3 p-3">
                  <ProductImage src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-md" />
                  <span className="font-medium">{p.name}</span>
                </td>
                <td className="p-3">{formatZAR(p.price_cents)}</td>
                <td className="p-3">{p.stock_quantity}</td>
                <td className="space-x-1 p-3">
                  <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Hidden'}</Badge>
                  {p.is_featured && <Badge variant="secondary">Featured</Badge>}
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No products yet. Add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
