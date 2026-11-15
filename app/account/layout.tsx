import Link from 'next/link'
import AccountNav from '@/components/account/account-nav'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions/auth'
import { requireUser } from '@/lib/auth'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser('/account')

  return (
    <div className="bg-muted/50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="text-xs">
          <Link href="/" className="hover:underline">
            Homepage
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-primary">My Account</span>
        </nav>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">My Account</h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <AccountNav />
            <form action={logout} className="mt-4 hidden md:block">
              <Button type="submit" variant="outline" size="sm" className="w-full rounded-lg">
                Log out
              </Button>
            </form>
          </div>
          <div className="rounded-2xl bg-background p-6 shadow-sm md:p-10">{children}</div>
        </div>
      </div>
    </div>
  )
}
