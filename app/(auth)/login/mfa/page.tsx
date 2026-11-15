import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { verifyLoginMfa } from '@/app/actions/security'
import { getAal, getUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'

export default async function LoginMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams
  const user = await getUser()
  if (!user) redirect('/login')

  // Nothing to do if this session does not need (or already passed) the second step
  const aal = await getAal()
  if (!(aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2')) redirect(safeNext(next))

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Two-step verification</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the 6-digit code from your authenticator app to finish signing in.
      </p>

      {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <form action={verifyLoginMfa} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={safeNext(next)} />
        <Input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={7}
          required
          autoFocus
        />
        <Button type="submit" className="w-full">
          Verify
        </Button>
      </form>
    </div>
  )
}
