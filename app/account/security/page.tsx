import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MfaSetup from '@/components/account/mfa-setup'
import { Field, Notice, Section } from '@/components/account/section'
import { changePassword, signOutOtherDevices } from '@/app/actions/security'
import { createClient } from '@/lib/supabase/server'
import { getProfile, requireUser } from '@/lib/auth'
import { SITE } from '@/lib/site'
import { SECURITY_EVENT_LABELS } from '@/lib/security-checks'

type EventRow = { id: number; type: string; ip: string | null; created_at: string }

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const user = await requireUser('/account/security')
  const { error, message } = await searchParams
  const supabase = await createClient()

  const [{ data: factors }, { data: events }, profile] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase
      .from('security_events')
      .select('id, type, ip, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    getProfile(),
  ])
  const factor = factors?.totp?.[0] ?? null
  const rows = (events ?? []) as EventRow[]
  const adminNeedsMfa = SITE.requireAdminMfa && profile?.role === 'admin' && !factor

  return (
    <div>
      <h2 className="text-2xl font-bold">Security</h2>
      <Notice error={error} message={message} />
      {adminNeedsMfa && (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Your account is an admin account. Turn on two-step verification below to unlock the admin area.
        </p>
      )}

      <Section
        title="Password"
        description="Use a long passphrase of at least 12 characters that you do not use anywhere else. Changing it signs out your other devices."
      >
        <form action={changePassword} className="space-y-4">
          <Field label="Current password">
            <Input name="current_password" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="New password" hint="At least 12 characters. A short phrase of a few words works well.">
            <Input name="new_password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password">
            <Input name="confirm_password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
          </Field>
          <Button type="submit">Update password</Button>
        </form>
      </Section>

      <Section
        title="Two-step verification"
        description="A second check when you sign in, using an app on your phone. It is the single best protection for your account."
      >
        <MfaSetup enabledFactorId={factor?.id ?? null} />
      </Section>

      <Section
        title="Signed-in devices"
        description="If you used a shared computer or lost a phone, sign out everywhere except this device."
      >
        <form action={signOutOtherDevices}>
          <Button type="submit" variant="outline">
            Sign out of other devices
          </Button>
        </form>
      </Section>

      <Section
        title="Recent security activity"
        description="Sign-ins and security changes on your account. If you see something you do not recognise, change your password straight away."
      >
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {rows.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="font-medium">{SECURITY_EVENT_LABELS[e.type] ?? e.type}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(e.created_at).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
                  {e.ip ? ` · ${e.ip}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
