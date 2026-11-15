import { redirect } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resendConfirmation, saveVerificationProfile } from '@/app/actions/auth'
import { getProfile, requireUser } from '@/lib/auth'
import { safeNext } from '@/lib/format'
import { getVerification } from '@/lib/verification'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>
}) {
  const { next, error, message } = await searchParams
  const user = await requireUser('/verify')
  const profile = await getProfile()
  const v = getVerification(user, profile)
  const target = safeNext(next)

  if (v.ok) redirect(target)

  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-2xl font-bold">Verify your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We check every account before it can order. It keeps your details and your payments safe.
      </p>

      {error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {message && <p className="mt-4 rounded-md bg-muted p-3 text-sm">{message}</p>}

      <section className="mt-6 rounded-2xl bg-muted p-5">
        <div className="flex items-center gap-2 font-semibold">
          {v.emailVerified ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
          Confirm your email
        </div>
        {v.emailVerified ? (
          <p className="mt-2 text-sm text-muted-foreground">{user.email} is confirmed.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Open the link we sent to <span className="font-medium text-foreground">{user.email}</span>. Check your
              spam folder too.
            </p>
            <form action={resendConfirmation} className="mt-3">
              <input type="hidden" name="email" value={user.email ?? ''} />
              <input type="hidden" name="returnTo" value="/verify" />
              <input type="hidden" name="next" value={target} />
              <Button type="submit" variant="outline" size="sm" className="rounded-full">
                Resend verification email
              </Button>
            </form>
          </>
        )}
      </section>

      <section className="mt-4 rounded-2xl bg-muted p-5">
        <div className="flex items-center gap-2 font-semibold">
          {v.profileComplete ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
          Add your name and phone number
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The courier uses your phone number to reach you about your delivery.
        </p>
        <form action={saveVerificationProfile} className="mt-3 space-y-3">
          <input type="hidden" name="next" value={target} />
          <Input name="full_name" placeholder="Full name" defaultValue={profile?.full_name ?? ''} required />
          <Input
            name="phone"
            type="tel"
            placeholder="Phone, e.g. +27 82 123 4567"
            defaultValue={profile?.phone ?? ''}
            required
          />
          <Button type="submit" className="rounded-full">
            Save
          </Button>
        </form>
      </section>
    </div>
  )
}
