'use client'

import { type ReactNode, useState } from 'react'
import {
  type Beneficiary,
  issuanceBeneficiaries,
  liveTuRate,
  monthlyTotals,
  onboardingFee,
  type Rates,
  type Split,
  simulateIssuance,
  simulateOnboarding,
  simulateVerification,
  type TuRate,
  tuInVna,
  type Volumes,
  verificationBeneficiaries,
} from '@/domain/economics'
import type { NetworkModel } from '@/domain/network-model'
import { isRole } from '@/domain/roles'
import { ROLE_LABELS } from '@/features/inspector/entity-facts'
import type { ExchangeRate } from '@/lib/api/schemas'
import { amount, percent, signed } from './format'

type Op = 'onboarding' | 'issuance' | 'verification'

interface FeeRow {
  key: string
  label: string
  input: string
}

interface Scenario {
  onboarding: string
  issuance: FeeRow[]
  verification: FeeRow[]
}

interface SimulationPanelProps {
  chainId: string
  model: NetworkModel
  rates: Rates
  exchangeRates: readonly ExchangeRate[]
  now: Date
  onClose: () => void
}

const SPEC = 'spec'

const SPEC_EXAMPLE: Scenario = {
  onboarding: '1000',
  issuance: [
    { key: 'ecosystem', label: 'Ecosystem', input: '10' },
    { key: 'issuerGrantor', label: 'Issuer grantor', input: '5' },
  ],
  verification: [
    { key: 'ecosystem', label: 'Ecosystem', input: '20' },
    { key: 'issuerGrantor', label: 'Issuer grantor', input: '5' },
    { key: 'issuer', label: 'Issuer', input: '30' },
    { key: 'verifierGrantor', label: 'Verifier grantor', input: '2' },
  ],
}

const DEFAULT_VOLUMES = { onboardings: '10', issuances: '1000', verifications: '1000' }

const OPS: { id: Op; label: string; payer: string }[] = [
  { id: 'onboarding', label: 'Onboarding', payer: 'Applicant' },
  { id: 'issuance', label: 'Issuance', payer: 'Issuer (payer)' },
  { id: 'verification', label: 'Verification', payer: 'Verifier (payer)' },
]

const toNumber = (input: string) => {
  const n = Number(input)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const roleLabel = (role: string) => (isRole(role) ? ROLE_LABELS[role] : role)

const rowOf = (b: Beneficiary): FeeRow => ({
  key: String(b.participantId),
  label: `${roleLabel(b.role)} #${b.participantId}`,
  input: String(b.fee),
})

const feesOf = (rows: FeeRow[]) => Object.fromEntries(rows.map((row) => [row.key, toNumber(row.input)]))

function scenarioFor(model: NetworkModel, issuerId: number | null, verifierId: number | null): Scenario {
  const participants = model.raw.participants
  const applicant = issuerId ?? verifierId
  return {
    onboarding: String(applicant === null ? 0 : onboardingFee(applicant, participants)),
    issuance: issuerId === null ? [] : issuanceBeneficiaries(issuerId, participants).map(rowOf),
    verification: verificationBeneficiaries(issuerId, verifierId, participants).map(rowOf),
  }
}

function Tu({ value, sign = true, tu }: { value: number; sign?: boolean; tu: TuRate | null }) {
  const text = sign ? signed(value) : amount(value)
  if (!tu) return <>{`${text} TU`}</>
  const vna = Math.sign(value) * tuInVna(Math.abs(value), tu)
  return <>{`${text} TU ≈ ${sign ? signed(vna, 6) : amount(vna, 6)} VNA`}</>
}

function Line({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-amber-200/10 py-[6px] text-[12px] last:border-b-0">
      <span className="text-scene-mut">{label}</span>
      <b data-testid={testId} className="text-right font-medium tabular-nums">
        {children}
      </b>
    </div>
  )
}

function SplitLine({ label, split, tu }: { label: string; split: Split; tu: TuRate | null }) {
  return (
    <Line label={label}>
      <span className="block">
        wallet <Tu value={split.wallet} tu={tu} />
      </span>
      <span className="block text-[11px] text-amber-200/80">
        deposit <Tu value={split.deposit} tu={tu} />
      </span>
    </Line>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-[5px] text-[12px]">
      <span className="truncate text-scene-mut">{label}</span>
      <input
        aria-label={label}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-[110px] rounded-md border border-amber-200/20 bg-black/30 px-2 py-1 text-right tabular-nums text-white"
      />
    </label>
  )
}

const Heading = ({ children }: { children: ReactNode }) => (
  <div className="mt-3 mb-1 text-[10px] uppercase tracking-[.09em] text-amber-200/70">{children}</div>
)

const selectClass = 'w-full rounded-md border border-amber-200/20 bg-black/40 px-2 py-1 text-[12px] text-white'

export function SimulationPanel({ chainId, model, rates, exchangeRates, now, onClose }: SimulationPanelProps) {
  const [source, setSource] = useState(SPEC)
  const [issuerId, setIssuerId] = useState<number | null>(null)
  const [verifierId, setVerifierId] = useState<number | null>(null)
  const [scenario, setScenario] = useState<Scenario>(SPEC_EXAMPLE)
  const [volumes, setVolumes] = useState(DEFAULT_VOLUMES)
  const [op, setOp] = useState<Op>('issuance')

  const liveSchemas = model.raw.schemas.filter((s) => model.entities.has(`schema:${s.id}`))
  const tuSchemas = liveSchemas.filter((s) => s.pricing_asset_type === 'TU')
  const otherAssets = liveSchemas.length - tuSchemas.length
  const schemaId = source === SPEC ? null : Number(source)
  const members = (role: string) =>
    model.raw.participants.filter(
      (p) => p.schema_id === schemaId && p.role === role && model.entities.has(`participant:${p.id}`)
    )
  const issuers = members('ISSUER')
  const verifiers = members('VERIFIER')

  const pick = (nextSource: string) => {
    setSource(nextSource)
    if (nextSource === SPEC) {
      setIssuerId(null)
      setVerifierId(null)
      setScenario(SPEC_EXAMPLE)
      return
    }
    const id = Number(nextSource)
    const first = (role: string) =>
      model.raw.participants.find(
        (p) => p.schema_id === id && p.role === role && model.entities.has(`participant:${p.id}`)
      )?.id ?? null
    const issuer = first('ISSUER')
    const verifier = first('VERIFIER')
    setIssuerId(issuer)
    setVerifierId(verifier)
    setScenario(scenarioFor(model, issuer, verifier))
  }

  const pickParticipants = (issuer: number | null, verifier: number | null) => {
    setIssuerId(issuer)
    setVerifierId(verifier)
    setScenario(scenarioFor(model, issuer, verifier))
  }

  const editRow = (key: 'issuance' | 'verification', rowKey: string, input: string) =>
    setScenario((s) => ({ ...s, [key]: s[key].map((row) => (row.key === rowKey ? { ...row, input } : row)) }))

  const onboarding = simulateOnboarding(toNumber(scenario.onboarding), rates)
  const issuance = simulateIssuance(feesOf(scenario.issuance), rates)
  const verification = simulateVerification(feesOf(scenario.verification), rates)
  const volumeNumbers: Volumes = {
    onboardings: toNumber(volumes.onboardings),
    issuances: toNumber(volumes.issuances),
    verifications: toNumber(volumes.verifications),
  }
  const totals = monthlyTotals(onboarding, issuance, verification, volumeNumbers)
  const tu = liveTuRate(exchangeRates, now)
  const active = OPS.find((o) => o.id === op) ?? OPS[1]
  const payPer = op === 'issuance' ? issuance : verification
  const rows = op === 'issuance' ? scenario.issuance : scenario.verification

  return (
    <div
      role="dialog"
      aria-label="Simulation: what-if trust fees"
      className="fixed top-[72px] left-1/2 z-30 max-h-[calc(100vh-150px)] w-[460px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-y-auto rounded-[14px] border-2 border-dashed border-amber-400/60 bg-[rgba(36,24,6,.86)] p-[18px] text-scene-txt shadow-[0_0_40px_rgba(251,191,36,.12)] backdrop-blur-[14px]"
    >
      <button
        type="button"
        aria-label="Close simulation"
        onClick={onClose}
        className="absolute top-3 right-3.5 cursor-pointer text-lg leading-none text-scene-mut hover:text-white"
      >
        ×
      </button>
      <span className="inline-block rounded-full bg-amber-400/20 px-[9px] py-[3px] text-[11px] font-semibold uppercase tracking-[.09em] text-amber-300">
        Simulation
      </span>
      <h2 className="mt-1.5 text-lg font-semibold tracking-[-.01em]">What-if trust fees</h2>
      <p className="mt-1 text-[11.5px] text-amber-100/70">
        Hypothetical amounts, the only simulated numbers in this app. Rules from the VPR v4 spec, “Business models”.
        Live td params on {chainId}: trust_deposit_rate {percent(rates.trustDepositRate)} · user_agent_reward_rate{' '}
        {percent(rates.userAgentRewardRate)} · wallet_user_agent_reward_rate {percent(rates.walletUserAgentRewardRate)}
      </p>

      <Heading>Pre-fill</Heading>
      <label className="block text-[12px]">
        <span className="mb-1 block text-scene-mut">Start from</span>
        <select aria-label="Start from" value={source} onChange={(e) => pick(e.target.value)} className={selectClass}>
          <option value={SPEC}>VPR v4 spec example</option>
          {tuSchemas.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {`${model.entities.get(`schema:${s.id}`)?.name ?? `Schema ${s.id}`} #${s.id} · ${
                model.entities.get(`ecosystem:${s.ecosystem_id}`)?.name ?? `ecosystem ${s.ecosystem_id}`
              }`}
            </option>
          ))}
        </select>
      </label>
      {otherAssets > 0 && (
        <p className="mt-1 text-[11px] text-scene-mut">
          {otherAssets} schemas price fees in another asset and are not listed: the simulator works in TU.
        </p>
      )}
      {schemaId !== null && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[12px]">
            <span className="mb-1 block text-scene-mut">Issuer</span>
            <select
              aria-label="Issuer"
              value={issuerId === null ? '' : String(issuerId)}
              onChange={(e) => pickParticipants(e.target.value ? Number(e.target.value) : null, verifierId)}
              className={selectClass}
            >
              <option value="">none</option>
              {issuers.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {`${model.entities.get(`participant:${p.id}`)?.name ?? 'Participant'} #${p.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[12px]">
            <span className="mb-1 block text-scene-mut">Verifier</span>
            <select
              aria-label="Verifier"
              value={verifierId === null ? '' : String(verifierId)}
              onChange={(e) => pickParticipants(issuerId, e.target.value ? Number(e.target.value) : null)}
              className={selectClass}
            >
              <option value="">none</option>
              {verifiers.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {`${model.entities.get(`participant:${p.id}`)?.name ?? 'Participant'} #${p.id}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div role="tablist" aria-label="Operation" className="mt-3 flex gap-1 rounded-[10px] bg-black/30 p-1">
        {OPS.map((o) => (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={op === o.id}
            onClick={() => setOp(o.id)}
            className={`flex-1 cursor-pointer rounded-[8px] px-2 py-1.5 text-[12px] font-medium ${
              op === o.id ? 'bg-amber-400/25 text-amber-100' : 'text-scene-mut hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <Heading>Fees (TU)</Heading>
      {op === 'onboarding' ? (
        <NumberField
          label="Validator validation fee"
          value={scenario.onboarding}
          onChange={(input) => setScenario((s) => ({ ...s, onboarding: input }))}
        />
      ) : rows.length > 0 ? (
        rows.map((row) => (
          <NumberField
            key={row.key}
            label={`${row.label} fee`}
            value={row.input}
            onChange={(input) => editRow(op, row.key, input)}
          />
        ))
      ) : (
        <p className="py-1 text-[11.5px] text-scene-mut">No beneficiary up the validator tree for this pick.</p>
      )}

      <Heading>Per {active.label.toLowerCase()}</Heading>
      {op === 'onboarding' ? (
        <>
          <Line label="Applicant account" testId="payer-total">
            <Tu value={onboarding.applicant} tu={tu} />
          </Line>
          <Line label="Applicant trust deposit" testId="payer-deposit">
            <Tu value={-onboarding.applicant - onboarding.validator.wallet - onboarding.validator.deposit} tu={tu} />
          </Line>
          <SplitLine label="Validator" split={onboarding.validator} tu={tu} />
        </>
      ) : (
        <>
          <Line label={`${active.payer} account`} testId="payer-total">
            <Tu value={payPer.payer} tu={tu} />
          </Line>
          <Line label="Payer trust deposit" testId="payer-deposit">
            <Tu value={payPer.payerDeposit} tu={tu} />
          </Line>
          {rows.map((row) => (
            <SplitLine key={row.key} label={row.label} split={payPer.beneficiaries[row.key]} tu={tu} />
          ))}
          <SplitLine label="User agent" split={payPer.userAgent} tu={tu} />
          <SplitLine label="Wallet user agent" split={payPer.walletUserAgent} tu={tu} />
        </>
      )}

      <Heading>Per month</Heading>
      <NumberField
        label="Onboardings per month"
        value={volumes.onboardings}
        onChange={(v) => setVolumes((s) => ({ ...s, onboardings: v }))}
      />
      <NumberField
        label="Issuances per month"
        value={volumes.issuances}
        onChange={(v) => setVolumes((s) => ({ ...s, issuances: v }))}
      />
      <NumberField
        label="Verifications per month"
        value={volumes.verifications}
        onChange={(v) => setVolumes((s) => ({ ...s, verifications: v }))}
      />
      <div className="mt-1">
        <Line label="Paid by payers" testId="monthly-paid">
          <Tu value={totals.paidByPayers} sign={false} tu={tu} />
        </Line>
        <Line label="Beneficiary wallet revenue">
          <Tu value={totals.beneficiaryRevenue} sign={false} tu={tu} />
        </Line>
        <Line label="Trust deposit growth">
          <Tu value={totals.depositGrowth} sign={false} tu={tu} />
        </Line>
        <Line label="User-agent rewards">
          <Tu value={totals.agentRewards} sign={false} tu={tu} />
        </Line>
      </div>

      <p className="mt-3 text-[11px] text-amber-100/60">
        {tu
          ? `1 TU = ${amount(tu.rate / 10 ** tu.scale, 6)} uvna · rate #${tu.id} · updated ${tu.updated ?? 'unknown'} · expires ${tu.expires ?? 'unknown'} · /v4/exchange-rate/list on ${chainId}`
          : `No TU exchange rate on ${chainId}: amounts stay in TU.`}
      </p>
    </div>
  )
}
