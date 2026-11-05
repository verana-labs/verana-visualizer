import { describe, expect, it } from 'vitest'
import { type ExchangeRate, exchangeRateSchema, type Participant } from '@/lib/api/schemas'
import { recorded } from '../../tests/support/recorded'
import {
  issuanceBeneficiaries,
  liveTuRate,
  monthlyTotals,
  onboardingFee,
  type Rates,
  ratesFromTdParams,
  simulateIssuance,
  simulateOnboarding,
  simulateVerification,
  tuInVna,
  tuToUvna,
  verificationBeneficiaries,
} from './economics'

const R: Rates = { trustDepositRate: 0.05, userAgentRewardRate: 0.05, walletUserAgentRewardRate: 0.05 }

describe('VPR v4 business models worked examples', () => {
  it('splits an onboarding fee between the escrow and the validator', () => {
    expect(simulateOnboarding(1000, R)).toEqual({ applicant: -1050, validator: { wallet: 950, deposit: 50 } })
  })

  it('distributes a verification along the participant tree', () => {
    const v = simulateVerification({ ecosystem: 20, issuerGrantor: 5, issuer: 30, verifierGrantor: 2 }, R)
    expect(v.payer).toBeCloseTo(-65.55)
    expect(v.payerDeposit).toBeCloseTo(2.85)
    expect(v.beneficiaries.ecosystem).toEqual({ wallet: 19, deposit: 1 })
    expect(v.beneficiaries.issuer).toEqual({ wallet: 28.5, deposit: 1.5 })
    expect(v.userAgent.wallet).toBeCloseTo(2.7075)
    expect(v.userAgent.deposit).toBeCloseTo(0.1425)
  })

  it('distributes an issuance along the participant tree', () => {
    const i = simulateIssuance({ ecosystem: 10, issuerGrantor: 5 }, R)
    expect(i.payer).toBeCloseTo(-17.25)
    expect(i.userAgent.wallet).toBeCloseTo(0.7125)
    expect(i.userAgent.deposit).toBeCloseTo(0.0375)
  })

  it('matches every other figure of the spec diagrams', () => {
    const i = simulateIssuance({ ecosystem: 10, issuerGrantor: 5 }, R)
    expect(i.payerDeposit).toBeCloseTo(0.75)
    expect(i.beneficiaries.ecosystem.wallet).toBeCloseTo(9.5)
    expect(i.beneficiaries.ecosystem.deposit).toBeCloseTo(0.5)
    expect(i.beneficiaries.issuerGrantor.wallet).toBeCloseTo(4.75)
    expect(i.beneficiaries.issuerGrantor.deposit).toBeCloseTo(0.25)
    expect(i.walletUserAgent.wallet).toBeCloseTo(0.7125)
    const v = simulateVerification({ ecosystem: 20, issuerGrantor: 5, issuer: 30, verifierGrantor: 2 }, R)
    expect(v.beneficiaries.verifierGrantor.wallet).toBeCloseTo(1.9)
    expect(v.beneficiaries.verifierGrantor.deposit).toBeCloseTo(0.1)
    expect(v.walletUserAgent.deposit).toBeCloseTo(0.1425)
  })

  it('uses distinct user-agent and wallet-user-agent rates', () => {
    const live: Rates = { trustDepositRate: 0.05, userAgentRewardRate: 0.1, walletUserAgentRewardRate: 0.2 }
    const i = simulateIssuance({ ecosystem: 100 }, live)
    expect(i.userAgent.wallet + i.userAgent.deposit).toBeCloseTo(10)
    expect(i.walletUserAgent.wallet + i.walletUserAgent.deposit).toBeCloseTo(20)
    expect(i.payer).toBeCloseTo(-135)
  })

  it('rejects negative fees and rates outside 0..1', () => {
    expect(() => simulateOnboarding(-1, R)).toThrow(/fee/)
    expect(() => simulateIssuance({ ecosystem: -2 }, R)).toThrow(/ecosystem/)
    expect(() => simulateVerification({ a: 1 }, { ...R, trustDepositRate: 1.5 })).toThrow(/trustDepositRate/)
  })
})

describe('ratesFromTdParams', () => {
  it('reads the three rates from the live td params', () => {
    const { params } = recorded<{ params: Record<string, unknown> }>('td-params', 'testnet')
    expect(ratesFromTdParams(params)).toEqual({
      trustDepositRate: 0.05,
      userAgentRewardRate: 0.1,
      walletUserAgentRewardRate: 0.1,
    })
  })

  it('accepts decimal strings and fails fast on a missing rate', () => {
    expect(
      ratesFromTdParams({
        trust_deposit_rate: '0.05',
        user_agent_reward_rate: '0.1',
        wallet_user_agent_reward_rate: '0.1',
      }).trustDepositRate
    ).toBe(0.05)
    expect(() => ratesFromTdParams({ trust_deposit_rate: 0.05, user_agent_reward_rate: 0.1 })).toThrow(
      /wallet_user_agent_reward_rate/
    )
  })
})

const person = (id: number, role: string, validator: number | null, fees: Partial<Participant> = {}) =>
  ({
    id,
    role,
    validator_participant_id: validator,
    schema_id: 1,
    validation_fees: 0,
    issuance_fees: 0,
    verification_fees: 0,
    ...fees,
  }) as Participant

const specTree = [
  person(1, 'ECOSYSTEM', null, { issuance_fees: 10, verification_fees: 20, validation_fees: 1000 }),
  person(2, 'ISSUER_GRANTOR', 1, { issuance_fees: 5, verification_fees: 5, validation_fees: 1000 }),
  person(3, 'ISSUER', 2, { verification_fees: 30 }),
  person(4, 'VERIFIER_GRANTOR', 1, { verification_fees: 2 }),
  person(5, 'VERIFIER', 4),
]

describe('beneficiaries walk up the validator tree', () => {
  it('collects the issuer ancestors issuance fees, root first', () => {
    expect(issuanceBeneficiaries(3, specTree)).toEqual([
      { participantId: 1, role: 'ECOSYSTEM', fee: 10 },
      { participantId: 2, role: 'ISSUER_GRANTOR', fee: 5 },
    ])
  })

  it('collects the issuer branch and the verifier ancestors once each for a verification', () => {
    const fees = verificationBeneficiaries(3, 5, specTree)
    expect(fees.map((b) => [b.participantId, b.fee])).toEqual([
      [1, 20],
      [2, 5],
      [3, 30],
      [4, 2],
    ])
    const byKey = Object.fromEntries(fees.map((b) => [String(b.participantId), b.fee]))
    expect(simulateVerification(byKey, R).payer).toBeCloseTo(-65.55)
  })

  it('works without a verifier and stops on cycles or missing validators', () => {
    expect(verificationBeneficiaries(3, null, specTree).map((b) => b.participantId)).toEqual([1, 2, 3])
    const looped = [
      person(7, 'ISSUER_GRANTOR', 8, { issuance_fees: 1 }),
      person(8, 'ISSUER_GRANTOR', 7),
      person(9, 'ISSUER', 7),
    ]
    expect(issuanceBeneficiaries(9, looped).map((b) => b.participantId)).toEqual([8, 7])
    expect(issuanceBeneficiaries(9, [person(9, 'ISSUER', 99)])).toEqual([])
  })

  it('takes the onboarding fee from the applicant validator', () => {
    expect(onboardingFee(3, specTree)).toBe(1000)
    expect(onboardingFee(1, specTree)).toBe(0)
  })
})

const rate = (overrides: Partial<ExchangeRate> = {}) =>
  ({
    id: 4,
    base_asset_type: 'TU',
    base_asset: 'tu',
    quote_asset_type: 'COIN',
    quote_asset: 'uvna',
    rate: '2500000',
    rate_scale: 6,
    state: true,
    updated: '2026-10-19T08:00:00Z',
    expires: '2026-10-21T08:00:00Z',
    ...overrides,
  }) as ExchangeRate

describe('liveTuRate', () => {
  const now = new Date('2026-10-20T00:00:00Z')

  it('finds nothing while the exchange-rate list is empty on both networks', () => {
    expect(liveTuRate(recorded('exchange-rates', 'testnet'), now)).toBeNull()
    expect(liveTuRate(recorded('exchange-rates', 'devnet'), now)).toBeNull()
  })

  it('parses a spec TU row whose base_asset is null and uses it', () => {
    const row = exchangeRateSchema.parse({ ...rate(), base_asset: null })
    expect(liveTuRate([row], now)).toMatchObject({ id: 4, scale: 6 })
  })

  it('rejects TU amounts too large to convert exactly, naming the amount', () => {
    const live = liveTuRate([rate()], now)
    if (!live) throw new Error('expected a live rate')
    expect(() => tuToUvna(1e21, live)).toThrow(/TU amount 1e\+21 is too large/)
  })

  it('uses only an active, unexpired TU to uvna rate', () => {
    expect(liveTuRate([rate({ state: false })], now)).toBeNull()
    expect(liveTuRate([rate({ expires: '2026-10-19T00:00:00Z' })], now)).toBeNull()
    expect(liveTuRate([rate({ quote_asset: 'uatom' })], now)).toBeNull()
    const live = liveTuRate([rate()], now)
    expect(live).toMatchObject({ id: 4, updated: '2026-10-19T08:00:00Z', expires: '2026-10-21T08:00:00Z' })
  })

  it('converts TU to VNA with the spec floor formula in uvna', () => {
    const live = liveTuRate([rate({ rate: '2500000', rate_scale: 6 })], now)
    if (!live) throw new Error('expected a live rate')
    expect(tuInVna(10, live)).toBe(0.000025)
    expect(tuInVna(1_000_000, live)).toBe(2.5)
  })

  it('converts in integers, so decimal TU amounts never lose a uvna to float error', () => {
    const at = (value: string) => {
      const live = liveTuRate([rate({ rate: value, rate_scale: 6 })], now)
      if (!live) throw new Error('expected a live rate')
      return live
    }
    expect(tuToUvna(0.1425, at('10000000000'))).toBe(1425n)
    expect(tuToUvna(4.35, at('100000000'))).toBe(435n)
    expect(tuToUvna(0.57, at('100000000'))).toBe(57n)
    expect(tuToUvna(1, at('2500000'))).toBe(2n)
  })

  it('refuses a rate without rate_scale instead of assuming 0', () => {
    expect(() => liveTuRate([rate({ rate_scale: undefined })], now)).toThrow(/rate_scale/)
    expect(() => liveTuRate([rate({ rate: '2.5' })], now)).toThrow(/rate/)
  })
})

describe('monthlyTotals', () => {
  it('multiplies each operation by its monthly volume', () => {
    const totals = monthlyTotals(
      simulateOnboarding(1000, R),
      simulateIssuance({ ecosystem: 10, issuerGrantor: 5 }, R),
      simulateVerification({ ecosystem: 20, issuerGrantor: 5, issuer: 30, verifierGrantor: 2 }, R),
      { onboardings: 2, issuances: 10, verifications: 100 }
    )
    expect(totals.paidByPayers).toBeCloseTo(2 * 1050 + 10 * 17.25 + 100 * 65.55)
    expect(totals.beneficiaryRevenue).toBeCloseTo(2 * 950 + 10 * (9.5 + 4.75) + 100 * (19 + 4.75 + 28.5 + 1.9))
    expect(totals.agentRewards).toBeCloseTo(10 * 1.5 + 100 * 5.7)
    expect(totals.depositGrowth).toBeCloseTo(
      2 * 100 + 10 * (0.75 + 0.5 + 0.25 + 0.075) + 100 * (2.85 + 1 + 0.25 + 1.5 + 0.1 + 0.285)
    )
  })
})
