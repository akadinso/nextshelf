'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { confirmMfaEnrollment, disableMfa, startMfaEnrollment } from '@/app/actions/security'

export default function MfaSetup({ enabledFactorId }: { enabledFactorId: string | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [setup, setSetup] = useState<{ factorId: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [confirmOff, setConfirmOff] = useState(false)

  function begin() {
    setError('')
    start(async () => {
      const r = await startMfaEnrollment()
      if (!r.ok) return setError(r.error)
      setSetup({ factorId: r.factorId, qr: r.qr, secret: r.secret })
    })
  }

  function confirm() {
    if (!setup) return
    setError('')
    start(async () => {
      const r = await confirmMfaEnrollment(setup.factorId, code)
      if (!r.ok) return setError(r.error)
      setSetup(null)
      setCode('')
      router.refresh()
    })
  }

  function turnOff() {
    if (!enabledFactorId) return
    setError('')
    start(async () => {
      const r = await disableMfa(enabledFactorId)
      if (!r.ok) return setError(r.error)
      setConfirmOff(false)
      router.refresh()
    })
  }

  if (enabledFactorId) {
    return (
      <div className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          On
        </p>
        <p className="text-sm text-muted-foreground">
          You need a code from your authenticator app each time you sign in.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {confirmOff ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={turnOff} disabled={pending}>
              Yes, turn it off
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmOff(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmOff(true)}>
            Turn off
          </Button>
        )}
      </div>
    )
  }

  if (!setup) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add a second step to your sign-in using an authenticator app such as Google Authenticator, Microsoft
          Authenticator or Authy. It protects your account even if your password is stolen.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={begin} disabled={pending}>
          {pending ? 'Starting…' : 'Set up two-step verification'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Open your authenticator app and add a new account.</li>
        <li>Scan this QR code (or type the key below).</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={setup.qr} alt="QR code to add this account to your authenticator app" className="h-44 w-44 rounded-lg border bg-white p-2" />
      <p className="break-all rounded-md bg-muted p-2 font-mono text-xs">{setup.secret}</p>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          className="w-32"
        />
        <Button onClick={confirm} disabled={pending || code.replace(/\s/g, '').length !== 6}>
          Verify and turn on
        </Button>
        <Button variant="ghost" onClick={() => setSetup(null)}>
          Cancel
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
