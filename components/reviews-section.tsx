import Link from 'next/link'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Stars } from '@/components/star-rating'
import { submitReview } from '@/app/actions/reviews'
import { formatDate } from '@/lib/format'
import type { Review } from '@/lib/types'

export default function ReviewsSection({
  productId,
  slug,
  reviews,
  average,
  count,
  userId,
  canReview,
  status,
}: {
  productId: string
  slug: string
  reviews: Review[]
  average: number
  count: number
  userId: string | null
  canReview: boolean
  status?: string
}) {
  const mine = reviews.find((r) => r.user_id === userId)
  const others = reviews.filter((r) => r.user_id !== userId)

  return (
    <section id="reviews" className="mx-auto max-w-6xl scroll-mt-40 px-4 py-14">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Customer reviews</h2>
        {count > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars rating={Math.round(average)} />
            <span className="font-medium">{Number(average).toFixed(1)}</span>
            <span className="text-muted-foreground">
              ({count} {count === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {status === 'saved' && <p className="mb-4 rounded-md bg-muted p-3 text-sm">Thanks, your review is live.</p>}
      {status === 'denied' && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Only customers who have bought this product can review it.
        </p>
      )}
      {status === 'invalid' && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">Please choose a star rating.</p>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {[...(mine ? [mine] : []), ...others].map((r) => (
            <article key={r.id} className="rounded-2xl bg-muted p-5">
              <div className="flex items-center justify-between">
                <Stars rating={r.rating} />
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
              {r.body && <p className="mt-3 text-sm">{r.body}</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.author_name}</span> · Verified buyer
                {r.user_id === userId && ' · Your review'}
              </p>
            </article>
          ))}
          {reviews.length === 0 && (
            <p className="rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
              No reviews yet. Buyers can leave the first one.
            </p>
          )}
        </div>

        <aside className="h-fit rounded-2xl border p-5">
          {canReview ? (
            <form action={submitReview} className="space-y-4">
              <h3 className="font-semibold">{mine ? 'Edit your review' : 'Write a review'}</h3>
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="slug" value={slug} />

              <div className="flex flex-wrap gap-2">
                {[5, 4, 3, 2, 1].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      required
                      defaultChecked={mine?.rating === n}
                      className="peer sr-only"
                    />
                    <span className="flex h-9 items-center gap-1 rounded-full border px-3 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                      {n}
                      <Star className="h-3.5 w-3.5" />
                    </span>
                  </label>
                ))}
              </div>

              <textarea
                name="body"
                rows={4}
                maxLength={1000}
                placeholder="What did you think of it?"
                defaultValue={mine?.body ?? ''}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" className="w-full">
                {mine ? 'Update review' : 'Post review'}
              </Button>
            </form>
          ) : userId ? (
            <p className="text-sm text-muted-foreground">
              Only customers who have bought this product can review it.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link href={`/login?next=${encodeURIComponent(`/products/${slug}#reviews`)}`} className="font-medium text-foreground underline">
                Log in
              </Link>{' '}
              to review products you have bought.
            </p>
          )}
        </aside>
      </div>
    </section>
  )
}
