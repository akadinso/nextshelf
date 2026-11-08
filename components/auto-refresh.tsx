'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-fetches the page every few seconds (max 10 times) while we wait for the PayFast webhook
export default function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    let n = 0
    const t = setInterval(() => {
      router.refresh()
      if (++n >= 10) clearInterval(t)
    }, 3000)
    return () => clearInterval(t)
  }, [active, router])
  return null
}
