'use client'

import { useEffect, useState } from 'react'
import { ECS_SPEC_URL, isEcsCompliant } from '@/domain/ecs'
import type { NetworkModel } from '@/domain/network-model'
import { logger } from '@/lib/logger'
import { safeHttpUrl } from '@/lib/safe-url'

const verdicts = new WeakMap<NetworkModel, Map<number, Promise<boolean>>>()

export function ecosystemEcsCompliance(model: NetworkModel, ecosystemId: number): Promise<boolean> {
  const cache = verdicts.get(model) ?? new Map<number, Promise<boolean>>()
  verdicts.set(model, cache)
  const cached = cache.get(ecosystemId)
  if (cached) return cached
  const verdict = isEcsCompliant(model.raw.schemas.filter((s) => s.ecosystem_id === ecosystemId))
  cache.set(ecosystemId, verdict)
  return verdict
}

export function EcsBadge({ model, ecosystemId }: { model: NetworkModel; ecosystemId: number | null }) {
  const [compliant, setCompliant] = useState(false)

  useEffect(() => {
    setCompliant(false)
    if (ecosystemId === null) return
    let cancelled = false
    ecosystemEcsCompliance(model, ecosystemId).then(
      (result) => {
        if (!cancelled) setCompliant(result)
      },
      (error: unknown) => logger.error(`Could not compute the ECS schema digests of ecosystem ${ecosystemId}`, error)
    )
    return () => {
      cancelled = true
    }
  }, [model, ecosystemId])

  const href = safeHttpUrl(ECS_SPEC_URL)
  if (!compliant || !href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="All 5 Essential Credential Schemas match the Verifiable Trust spec digests (SHA-384 over JCS, $id removed)"
      className="inline-block shrink-0 rounded-full bg-[#a855f7]/20 px-[9px] py-[3px] text-[11px] font-medium text-[#d8b4fe] hover:bg-[#a855f7]/30"
    >
      ECS compliant
    </a>
  )
}
