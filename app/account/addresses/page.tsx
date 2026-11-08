import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addAddress, deleteAddress, setDefaultAddress } from '@/app/actions/account'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { PROVINCES } from '@/lib/provinces'
import type { Address } from '@/lib/types'

export default async function AddressesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await requireUser('/account/addresses')
  const { error } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
  const addresses = (data ?? []) as Address[]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Saved addresses</h1>

      <ul className="space-y-3">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-lg border p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">
                  {a.label || a.recipient_name}
                  {a.is_default && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs font-normal">Default</span>
                  )}
                </p>
                <p className="text-muted-foreground">
                  {a.recipient_name}
                  <br />
                  {a.street}
                  {a.suburb ? `, ${a.suburb}` : ''}
                  <br />
                  {a.city}, {a.province} {a.postal_code}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!a.is_default && (
                  <form action={setDefaultAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Make default
                    </Button>
                  </form>
                )}
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          </li>
        ))}
        {addresses.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}
      </ul>

      <form action={addAddress} className="mt-10 space-y-3">
        <h2 className="font-semibold">Add an address</h2>
        {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="label" placeholder="Label (Home, Work…)" />
          <Input name="recipient_name" placeholder="Full name *" required />
          <Input name="phone" placeholder="Phone" />
          <Input name="street" placeholder="Street address *" required />
          <Input name="suburb" placeholder="Suburb" />
          <Input name="city" placeholder="City *" required />
          <select
            name="province"
            required
            defaultValue=""
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="" disabled>
              Province *
            </option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Input name="postal_code" placeholder="Postal code *" required />
        </div>
        <Button type="submit">Save address</Button>
      </form>
    </div>
  )
}
