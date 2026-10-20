import type { EntityId } from './network-model'

export interface TrustVerdictValue {
  trusted: boolean
  evaluatedAtBlock: number | null
  evaluatedAtTime: string | null
  expiresAtTime: string | null
}

export type TrustVerdictOutcome = TrustVerdictValue | { error: string }

export interface TrustHop {
  id: EntityId
  state: string
  opState: string | null
}

export type PathSource = 'verana-graph G1' | 'local'

export interface TrustCheck {
  did: string
  path: EntityId[]
  pathSource: PathSource
  pathError: string | null
  hops: TrustHop[]
  verdict: TrustVerdictOutcome
  raw: { resolve: unknown; graph: unknown }
}

export const TRUST_HOP_MS = 550

export function isVerdictError(verdict: TrustVerdictOutcome): verdict is { error: string } {
  return 'error' in verdict
}

export function verdictText(verdict: TrustVerdictOutcome): string {
  if (isVerdictError(verdict)) return `Could not resolve: ${verdict.error}`
  return verdict.trusted ? 'Trusted' : 'Not trusted'
}

export function hopLabel(hop: TrustHop): string {
  return hop.opState ? `State: ${hop.state} · Onboarding: ${hop.opState}` : `State: ${hop.state}`
}

export function verdictPath(did: string, block: number | null): string {
  const base = `/verdict/${encodeURIComponent(did)}`
  return block === null ? base : `${base}?block=${block}`
}

export function formatUtc(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`
}
