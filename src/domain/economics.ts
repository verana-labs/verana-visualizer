import type { ExchangeRate, Participant } from '@/lib/api/schemas'

export interface Rates {
  trustDepositRate: number
  userAgentRewardRate: number
  walletUserAgentRewardRate: number
}

export interface Split {
  wallet: number
  deposit: number
}

export interface OnboardingResult {
  applicant: number
  validator: Split
}

export interface PayPerResult {
  payer: number
  payerDeposit: number
  beneficiaries: Record<string, Split>
  userAgent: Split
  walletUserAgent: Split
}

export interface Beneficiary {
  participantId: number
  role: string
  fee: number
}

export interface TuRate {
  id: number
  rate: number
  scale: number
  updated: string | null
  expires: string | null
}

export interface Volumes {
  onboardings: number
  issuances: number
  verifications: number
}

export interface MonthlyTotals {
  paidByPayers: number
  beneficiaryRevenue: number
  depositGrowth: number
  agentRewards: number
}

const UVNA_PER_VNA = 1_000_000

function checkRates(r: Rates) {
  for (const [name, value] of Object.entries(r)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be within 0..1, got ${value}`)
  }
}

function checkFee(name: string, fee: number) {
  if (!Number.isFinite(fee) || fee < 0) throw new Error(`${name} fee must be a non-negative number, got ${fee}`)
}

function split(amount: number, r: Rates): Split {
  const deposit = amount * r.trustDepositRate
  return { wallet: amount - deposit, deposit }
}

export function simulateOnboarding(fee: number, r: Rates): OnboardingResult {
  checkRates(r)
  checkFee('validation', fee)
  return { applicant: -(fee + fee * r.trustDepositRate), validator: split(fee, r) }
}

function simulatePayPer(beneficiaryFees: Record<string, number>, r: Rates): PayPerResult {
  checkRates(r)
  for (const [name, fee] of Object.entries(beneficiaryFees)) checkFee(name, fee)
  const total = Object.values(beneficiaryFees).reduce((sum, fee) => sum + fee, 0)
  const payerDeposit = total * r.trustDepositRate
  const userAgent = total * r.userAgentRewardRate
  const walletUserAgent = total * r.walletUserAgentRewardRate
  return {
    payer: -(total + payerDeposit + userAgent + walletUserAgent),
    payerDeposit,
    beneficiaries: Object.fromEntries(Object.entries(beneficiaryFees).map(([name, fee]) => [name, split(fee, r)])),
    userAgent: split(userAgent, r),
    walletUserAgent: split(walletUserAgent, r),
  }
}

export const simulateIssuance = simulatePayPer
export const simulateVerification = simulatePayPer

function rateOf(params: Record<string, unknown>, name: string): number {
  const raw = params[name]
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : Number.NaN
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`td params: ${name} is missing or not a rate (got ${JSON.stringify(raw)})`)
  }
  return value
}

export function ratesFromTdParams(params: Record<string, unknown>): Rates {
  return {
    trustDepositRate: rateOf(params, 'trust_deposit_rate'),
    userAgentRewardRate: rateOf(params, 'user_agent_reward_rate'),
    walletUserAgentRewardRate: rateOf(params, 'wallet_user_agent_reward_rate'),
  }
}

function ancestorsOf(id: number, byId: Map<number, Participant>): Participant[] {
  const chain: Participant[] = []
  const seen = new Set([id])
  for (let next = byId.get(id)?.validator_participant_id ?? null; next !== null && !seen.has(next); ) {
    const validator = byId.get(next)
    if (!validator) break
    seen.add(next)
    chain.push(validator)
    next = validator.validator_participant_id
  }
  return chain.reverse()
}

const asBeneficiary = (p: Participant, fee: unknown): Beneficiary => ({
  participantId: p.id,
  role: p.role,
  fee: Number(fee),
})

export function issuanceBeneficiaries(issuerId: number, participants: readonly Participant[]): Beneficiary[] {
  const byId = new Map(participants.map((p) => [p.id, p]))
  return ancestorsOf(issuerId, byId).map((p) => asBeneficiary(p, p.issuance_fees))
}

export function verificationBeneficiaries(
  issuerId: number | null,
  verifierId: number | null,
  participants: readonly Participant[]
): Beneficiary[] {
  const byId = new Map(participants.map((p) => [p.id, p]))
  const issuer = issuerId === null ? undefined : byId.get(issuerId)
  const issuerBranch = issuer ? [...ancestorsOf(issuer.id, byId), issuer] : []
  const verifierBranch = verifierId === null ? [] : ancestorsOf(verifierId, byId)
  const unique = new Map([...issuerBranch, ...verifierBranch].map((p) => [p.id, p]))
  return [...unique.values()].map((p) => asBeneficiary(p, p.verification_fees))
}

export function onboardingFee(applicantId: number, participants: readonly Participant[]): number {
  const byId = new Map(participants.map((p) => [p.id, p]))
  const validatorId = byId.get(applicantId)?.validator_participant_id ?? null
  const validator = validatorId === null ? undefined : byId.get(validatorId)
  return validator ? Number(validator.validation_fees) : 0
}

const isActive = (state: unknown) => state === true || state === 'true'

export function liveTuRate(rates: readonly ExchangeRate[], now: Date): TuRate | null {
  const live = rates.find(
    (r) =>
      r.base_asset_type === 'TU' &&
      r.quote_asset_type === 'COIN' &&
      r.quote_asset === 'uvna' &&
      isActive(r.state) &&
      typeof r.expires === 'string' &&
      Date.parse(r.expires) > now.getTime()
  )
  if (!live) return null
  const rate = Number(live.rate)
  const scale = Number(live.rate_scale ?? 0)
  if (!Number.isFinite(rate) || !Number.isInteger(scale)) {
    throw new Error(`Exchange rate #${live.id} has an unreadable rate ${live.rate} / scale ${live.rate_scale}`)
  }
  return { id: live.id, rate, scale, updated: live.updated ?? null, expires: live.expires ?? null }
}

export function tuInVna(amount: number, tu: TuRate): number {
  return Math.floor((amount * tu.rate) / 10 ** tu.scale) / UVNA_PER_VNA
}

const sumSplits = (splits: Iterable<Split>, key: keyof Split) => [...splits].reduce((sum, s) => sum + s[key], 0)

export function monthlyTotals(
  onboarding: OnboardingResult,
  issuance: PayPerResult,
  verification: PayPerResult,
  volumes: Volumes
): MonthlyTotals {
  const applicantDeposit = -onboarding.applicant - onboarding.validator.wallet - onboarding.validator.deposit
  const payPer = [
    [issuance, volumes.issuances],
    [verification, volumes.verifications],
  ] as const
  const each = (pick: (r: PayPerResult) => number) => payPer.reduce((sum, [r, n]) => sum + pick(r) * n, 0)
  const agents = (r: PayPerResult) => [r.userAgent, r.walletUserAgent]
  return {
    paidByPayers: -onboarding.applicant * volumes.onboardings + each((r) => -r.payer),
    beneficiaryRevenue:
      onboarding.validator.wallet * volumes.onboardings +
      each((r) => sumSplits(Object.values(r.beneficiaries), 'wallet')),
    agentRewards: each((r) => sumSplits(agents(r), 'wallet') + sumSplits(agents(r), 'deposit')),
    depositGrowth:
      (applicantDeposit + onboarding.validator.deposit) * volumes.onboardings +
      each(
        (r) => r.payerDeposit + sumSplits(Object.values(r.beneficiaries), 'deposit') + sumSplits(agents(r), 'deposit')
      ),
  }
}
