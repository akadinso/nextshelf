import { redirect } from 'next/navigation'
import { completeOnboarding } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getProfile, requireUser } from '@/lib/auth'

export default async function OnboardingPage() {
  await requireUser('/onboarding')
  const profile = await getProfile()
  if (profile?.onboarded) redirect('/')

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Almost there</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirm your details so checkout is quicker next time.
      </p>

      <form action={completeOnboarding} className="mt-6 space-y-4">
        <Input name="full_name" placeholder="Full name" defaultValue={profile?.full_name ?? ''} required />
        <Input name="phone" type="tel" placeholder="Phone (for delivery updates)" defaultValue={profile?.phone ?? ''} />
        <Button type="submit" className="w-full">
          Continue to the shop
        </Button>
      </form>
    </div>
  )
}
