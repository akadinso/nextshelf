'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import AddressForm from '@/components/address-form'
import { addAddress } from '@/app/actions/account'
import { EMPTY_ADDRESS, type AddressInput } from '@/lib/address'

export default function AddAddressForm({
  placesEnabled,
  defaultName,
  defaultPhone,
}: {
  placesEnabled: boolean
  defaultName: string
  defaultPhone: string
}) {
  const [value, setValue] = useState<AddressInput>({
    ...EMPTY_ADDRESS,
    recipient_name: defaultName,
    phone: defaultPhone,
  })

  return (
    <form action={addAddress} className="space-y-3">
      <Input name="label" placeholder="Label (Home, Work…)" />
      <AddressForm value={value} onChange={setValue} placesEnabled={placesEnabled} />
      <Button type="submit">Save address</Button>
    </form>
  )
}
