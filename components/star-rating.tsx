import { Star } from 'lucide-react'

// Compact "★ 4.8 (133)" used on product cards. Renders nothing until a product has reviews.
export function RatingBadge({ value, count }: { value: number; count: number }) {
  if (!count) return null
  return (
    <div className="mt-0.5 flex items-center gap-1 text-xs">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-medium">{Number(value).toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  )
}

// Five-star row for individual reviews
export function Stars({ rating, className = 'h-4 w-4' }: { rating: number; className?: string }) {
  return (
    <div className="flex" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${className} ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`}
        />
      ))}
    </div>
  )
}
