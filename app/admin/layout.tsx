import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'

const LINKS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-8 flex gap-1 overflow-x-auto border-b pb-3 text-sm">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 font-medium hover:bg-muted">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
