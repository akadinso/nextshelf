'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Package, ShieldCheck, User } from 'lucide-react'

const ITEMS = [
  { href: '/account', label: 'My details', icon: User, exact: true },
  { href: '/account/addresses', label: 'My address book', icon: MapPin },
  { href: '/account/orders', label: 'My orders', icon: Package },
  { href: '/account/security', label: 'Security', icon: ShieldCheck },
]

export default function AccountNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto md:flex-col">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
