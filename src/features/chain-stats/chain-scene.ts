import { STREAM_SIZE } from '@/layouts/chain'
import type { Validator } from '@/lib/api/schemas'
import type { BlockSummary } from './load-chain-stats'

export interface ValidatorOrb {
  address: string
  moniker: string
  share: number
  size: number
  angle: number
  active: boolean
}

const MIN_ORB = 0.55
const ORB_RANGE = 1.9

const isActive = (v: Validator) => v.status === 'BOND_STATUS_BONDED' && !v.jailed

function tokensOf(v: Validator): number {
  const tokens = Number(v.tokens)
  if (!Number.isFinite(tokens) || tokens < 0) throw new Error(`Validator ${v.operator_address} has invalid tokens`)
  return tokens
}

export function validatorOrbs(validators: readonly Validator[]): ValidatorOrb[] {
  const power = validators.map((v) => (isActive(v) ? tokensOf(v) : 0))
  const total = power.reduce((sum, p) => sum + p, 0)
  const ranked = validators
    .map((v, i) => ({ v, share: total > 0 ? power[i] / total : 0 }))
    .sort((a, b) => b.share - a.share)
  return ranked.map(({ v, share }, i) => ({
    address: v.operator_address,
    moniker: v.description.moniker,
    share,
    size: MIN_ORB + ORB_RANGE * Math.sqrt(share),
    angle: (i / ranked.length) * Math.PI * 2,
    active: isActive(v),
  }))
}

export function streamBlocks(blocks: readonly BlockSummary[]): BlockSummary[] {
  return [...blocks].sort((a, b) => b.height - a.height).slice(0, STREAM_SIZE)
}
