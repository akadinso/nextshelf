import type { ReactNode } from 'react'

// Two-column settings block: explanation on the left, fields on the right
export function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-6">
      <h3 className="border-b pb-2 text-sm font-semibold">{title}</h3>
      <div className="grid gap-6 pt-5 md:grid-cols-[minmax(0,230px)_minmax(0,1fr)]">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="max-w-xl">{children}</div>
      </div>
    </section>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Notice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`mt-4 rounded-md p-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}
    >
      {error ?? message}
    </p>
  )
}
