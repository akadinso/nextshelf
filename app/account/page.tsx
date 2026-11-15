import { BadgeCheck, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, Notice, Section } from '@/components/account/section'
import { updateProfile } from '@/app/actions/auth'
import { changeEmail } from '@/app/actions/security'
import { getProfile, requireUser } from '@/lib/auth'
import { splitName } from '@/lib/security-checks'

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; message?: string }>
}) {
  const user = await requireUser('/account')
  const profile = await getProfile()
  const { saved, error, message } = await searchParams
  const { first, last } = splitName(profile?.full_name)

  return (
    <div>
      <h2 className="text-2xl font-bold">My details</h2>
      <Notice error={error} message={saved ? 'Your details were saved.' : message} />

      <Section
        title="Personal information"
        description="Your name and phone number are used for delivery and to help keep your account safe."
      >
        <form action={updateProfile} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input name="first_name" defaultValue={first} required maxLength={50} autoComplete="given-name" />
            </Field>
            <Field label="Last name">
              <Input name="last_name" defaultValue={last} maxLength={50} autoComplete="family-name" />
            </Field>
          </div>
          <Field label="Phone number" hint="Include your country code for international numbers, for example +27 82 123 4567.">
            <Input name="phone" type="tel" defaultValue={profile?.phone ?? ''} required autoComplete="tel" />
          </Field>
          <Button type="submit">Save</Button>
        </form>
      </Section>

      <Section
        title="E-mail address"
        description="We use your email for order updates and sign-in. Changing it needs your current password and a confirmation link."
      >
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{user.email}</span>
          {user.email_confirmed_at ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              <TriangleAlert className="h-3.5 w-3.5" /> Not verified
            </span>
          )}
        </div>
        <form action={changeEmail} className="space-y-4">
          <Field label="New email address">
            <Input name="new_email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Current password" hint="We ask for this to make sure it is really you.">
            <Input name="current_password" type="password" required autoComplete="current-password" />
          </Field>
          <Button type="submit" variant="outline">
            Change email
          </Button>
        </form>
      </Section>
    </div>
  )
}
