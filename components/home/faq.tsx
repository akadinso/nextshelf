import { SITE } from '@/lib/site'

export default function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-40 px-4 py-14">
      <h2 className="text-center text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
      <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
        Quick answers to the things people ask most.
      </p>

      <div className="mt-8 space-y-3">
        {SITE.faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl bg-muted px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
              {f.q}
              <span className="ml-4 text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
