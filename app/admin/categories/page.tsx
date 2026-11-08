import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createCategory, deleteCategory } from '@/app/actions/admin'
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.from('categories').select('id, name, slug, parent_id').order('sort_order').order('name')
  const categories = (data ?? []) as Category[]
  const top = categories.filter((c) => !c.parent_id)

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Categories</h1>
      {error && <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <ul className="divide-y rounded-lg border text-sm">
        {top.map((c) => (
          <li key={c.id}>
            <Row c={c} />
            {categories
              .filter((x) => x.parent_id === c.id)
              .map((child) => (
                <div key={child.id} className="border-t pl-6">
                  <Row c={child} />
                </div>
              ))}
          </li>
        ))}
        {categories.length === 0 && <li className="p-3 text-muted-foreground">No categories yet.</li>}
      </ul>

      <form action={createCategory} className="mt-6 flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium">Name</label>
          <Input name="name" required className="w-48" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Parent (optional)</label>
          <select name="parent_id" defaultValue="" className="h-9 rounded-md border bg-background px-3 text-sm">
            <option value="">None (top level)</option>
            {top.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Add</Button>
      </form>
    </div>
  )
}

function Row({ c }: { c: Category }) {
  return (
    <div className="flex items-center justify-between p-3">
      <span>
        {c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span>
      </span>
      <form action={deleteCategory}>
        <input type="hidden" name="id" value={c.id} />
        <Button type="submit" variant="outline" size="sm">
          Delete
        </Button>
      </form>
    </div>
  )
}
