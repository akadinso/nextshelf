'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  categories: { id: string; name: string; slug: string; parent_id: string | null }[]
  defaults: { q?: string; category?: string; min?: string; max?: string; sort?: string }
}

export default function FilterDrawer({ categories, defaults }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const params = new URLSearchParams()
    for (const [k, v] of fd.entries()) if (typeof v === 'string' && v.trim()) params.set(k, v.trim())
    router.push(`/products${params.size ? `?${params}` : ''}`)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Filter products</SheetTitle>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-5 px-4">
          <input type="hidden" name="q" value={defaults.q ?? ''} />

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              defaultValue={defaults.category ?? ''}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.parent_id ? '— ' : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Price (R)</label>
            <div className="flex gap-2">
              <Input name="min" type="number" min="0" placeholder="Min" defaultValue={defaults.min} />
              <Input name="max" type="number" min="0" placeholder="Max" defaultValue={defaults.max} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="sort">Sort by</label>
            <select
              id="sort"
              name="sort"
              defaultValue={defaults.sort ?? ''}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Apply</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.push('/products')
                setOpen(false)
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
