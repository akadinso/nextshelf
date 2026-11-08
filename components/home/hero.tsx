import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ProductImage from '@/components/product-image'
import { SITE } from '@/lib/site'

export default function Hero({ image, alt }: { image?: string; alt?: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6">
      <div className="grid overflow-hidden rounded-3xl bg-muted md:grid-cols-2">
        <div className="flex flex-col justify-center p-8 md:p-14">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl">{SITE.hero.title}</h1>
          <p className="mt-4 max-w-md text-muted-foreground">{SITE.hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link href="/products">Browse products</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full bg-background px-6">
              <Link href="#curated">Top picks</Link>
            </Button>
          </div>
        </div>

        <div className="relative min-h-64 md:min-h-[26rem]">
          {image ? (
            <ProductImage
              src={image}
              alt={alt ?? ''}
              contain
              className="absolute inset-0 h-full w-full p-8 mix-blend-multiply md:p-12"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 rounded-full bg-gradient-to-br from-primary/30 to-primary/5" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
