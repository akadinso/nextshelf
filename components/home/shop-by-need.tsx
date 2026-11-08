import Link from 'next/link'
import { Droplets, Package, Wind, ZapOff } from 'lucide-react'

const NEEDS = [
  {
    icon: Droplets,
    title: 'Clean drinking water',
    text: 'Tap, shower and gravity filters, jugs and bottles.',
    href: '/products?category=water-filters',
  },
  {
    icon: ZapOff,
    title: 'Load-shedding ready',
    text: 'No mains power needed: gravity, hand-powered or rechargeable.',
    href: '/products?tag=load-shedding',
  },
  {
    icon: Wind,
    title: 'Stay cool',
    text: 'Rechargeable fans and USB air coolers for hot days.',
    href: '/products?category=cooling',
  },
  {
    icon: Package,
    title: 'Store and dispense',
    text: 'Bottle pumps, dispensers and water carriers.',
    href: '/products?category=dispensers-storage',
  },
]

export default function ShopByNeed() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {NEEDS.map((n) => (
          <Link
            key={n.title}
            href={n.href}
            className="group rounded-2xl bg-muted p-5 transition-colors hover:bg-primary/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <n.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold">{n.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{n.text}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
