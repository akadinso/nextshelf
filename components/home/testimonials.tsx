import Link from 'next/link'
import { Stars } from '@/components/star-rating'

export type Testimonial = {
  id: string
  author_name: string
  rating: number
  body: string | null
  product: { name: string; slug: string } | null
}

export default function Testimonials({ reviews }: { reviews: Testimonial[] }) {
  if (reviews.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="rounded-3xl bg-muted p-8 md:p-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">What Our Buyers Say</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Real feedback from customers who bought the product.
          </p>
        </div>

        <div className="-mx-2 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-2 pb-2">
          {reviews.map((r) => (
            <figure key={r.id} className="w-72 shrink-0 snap-start rounded-2xl bg-background p-5">
              <Stars rating={r.rating} />
              <blockquote className="mt-3 line-clamp-5 text-sm">{r.body}</blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.author_name}</span>
                {r.product && (
                  <>
                    {' · '}
                    <Link href={`/products/${r.product.slug}`} className="hover:underline">
                      {r.product.name}
                    </Link>
                  </>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
