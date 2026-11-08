// Plain <img> so you don't need to configure next/image remote domains for Supabase Storage
export default function ProductImage({
  src,
  alt,
  className = '',
  contain = false,
}: {
  src?: string
  alt: string
  className?: string
  contain?: boolean
}) {
  if (!src) {
    return (
      <div className={`flex items-center justify-center bg-muted text-xs text-muted-foreground ${className}`}>
        No image
      </div>
    )
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`${contain ? 'object-contain' : 'object-cover'} ${className}`} loading="lazy" />
}
