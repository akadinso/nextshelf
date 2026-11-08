import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logout, updateProfile } from '@/app/actions/auth'
import { getProfile, requireUser } from '@/lib/auth'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const user = await requireUser('/account')
  const profile = await getProfile()
  const { saved } = await searchParams

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold">My account</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>

      <nav className="mt-6 grid gap-2 sm:grid-cols-2">
        <Link href="/account/orders" className="rounded-lg border p-4 text-sm font-medium hover:bg-muted">
          Order history
        </Link>
        <Link href="/account/addresses" className="rounded-lg border p-4 text-sm font-medium hover:bg-muted">
          Saved addresses
        </Link>
      </nav>

      <form action={updateProfile} className="mt-8 space-y-4">
        <h2 className="font-semibold">Profile</h2>
        {saved && <p className="rounded-md bg-muted p-3 text-sm">Saved.</p>}
        <Input name="full_name" placeholder="Full name" defaultValue={profile?.full_name ?? ''} />
        <Input name="phone" type="tel" placeholder="Phone" defaultValue={profile?.phone ?? ''} />
        <Button type="submit">Save changes</Button>
      </form>

      <form action={logout} className="mt-10">
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </div>
  )
}
