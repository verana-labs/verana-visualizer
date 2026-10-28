'use client'

import { type ReactNode, useState } from 'react'
import {
  type Beneficiary,
  issuanceBeneficiaries,
  MAX_CONVERTIBLE_TU,
  monthlyTotals,
  onboardingFee,
  type Rates,
  type Split,
  simulateIssuance,
  simulateOnboarding,
  simulateVerification,
  type TuRate,
  tuInVna,
  tuRateValue,
  UVNA_PER_VNA,
  type Volumes,
  verificationBeneficiaries,
} from '@/domain/economics'
import type { NetworkModel } from '@/domain/network-model'
import { isRole } from '@/domain/roles'
import { ROLE_LABELS } from '@/features/inspector/entity-facts'
import type { CredentialSchema } from '@/lib/api/schemas'
import { amount, percent, signed } from '@/lib/format'

type Op = 'onboarding' | 'issuance' | 'verification'
type Unit = 'TU' | 'VNA'

interface FeeRow {
  key: string
  label: string
  input: string
}

interface Scenario {
  unit: Unit
  onboarding: string
  issuance: FeeRow[]
  verification: FeeRow[]
}

interface SimulationPanelProps {
  chainId: string
  model: NetworkModel
  rates: Rates
  tuRate: TuRate | null
  onClose: () => void
}

const SPEC = 'spec'

const SPEC_EXAMPLE: Scenario = {
  unit: 'TU',
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

const parseAmount = (input: string): number | null => {
  if (input.trim() === '') return null
  const n = Number(input)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const unitOf = (schema: CredentialSchema): Unit | null => {
  if (schema.pricing_asset_type === 'TU') return 'TU'
  if (schema.pricing_asset_type === 'COIN' && schema.pricing_asset === 'uvna') return 'VNA'
  return null
}

const inUnit = (fee: number, unit: Unit) => (unit === 'VNA' ? fee / UVNA_PER_VNA : fee)

const roleLabel = (role: string) => (isRole(role) ? ROLE_LABELS[role] : role)

const rowOf =
  (unit: Unit) =>
  (b: Beneficiary): FeeRow => ({
    key: String(b.participantId),
    label: `${roleLabel(b.role)} #${b.participantId}`,
    input: String(inUnit(b.fee, unit)),
  })

const feesOf = (rows: FeeRow[]) => Object.fromEntries(rows.map((row) => [row.key, parseAmount(row.input) ?? 0]))

function scenarioFor(model: NetworkModel, unit: Unit, issuerId: number | null, verifierId: number | null): Scenario {
  const participants = model.raw.participants
  const applicant = issuerId ?? verifierId
  return {
    unit,
    onboarding: String(applicant === null ? 0 : inUnit(onboardingFee(applicant, participants), unit)),
    issuance: issuerId === null ? [] : issuanceBeneficiaries(issuerId, participants).map(rowOf(unit)),
    verification: verificationBeneficiaries(issuerId, verifierId, participants).map(rowOf(unit)),
  }
}

interface MoneyProps {
  value: number
  sign?: boolean
  unit: Unit
  tu: TuRate | null
}

function Money({ value, sign = true, unit, tu }: MoneyProps) {
  const text = sign ? signed(value) : amount(value, unit === 'VNA' ? 6 : 4)
  if (unit === 'VNA' || !tu) return <>{`${text} ${unit}`}</>
  if (Math.abs(value) >= MAX_CONVERTIBLE_TU) return <>{`${text} TU (too large to convert to VNA)`}</>
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

function SplitLine({ label, split, unit, tu }: { label: string; split: Split; unit: Unit; tu: TuRate | null }) {
  return (
    <Line label={label}>
      <span className="block">
        wallet <Money value={split.wallet} unit={unit} tu={tu} />
      </span>
      <span className="block text-[11px] text-amber-200/80">
        deposit <Money value={split.deposit} unit={unit} tu={tu} />
      </span>
    </Line>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const invalid = parseAmount(value) === null
  return (
    <label className="flex items-center justify-between gap-3 py-[5px] text-[12px]">
      <span className="truncate text-scene-mut">{label}</span>
      <input
        aria-label={label}
        aria-invalid={invalid}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-[110px] rounded-md border bg-black/30 px-2 py-1 text-right tabular-nums text-white ${
          invalid ? 'border-[#ff6b8b]' : 'border-amber-200/20'
        }`}
      />
    </label>
  )
}

const Heading = ({ children }: { children: ReactNode }) => (
  <div className="mt-3 mb-1 text-[10px] uppercase tracking-[.09em] text-amber-200/70">{children}</div>
)

const selectClass = 'w-full rounded-md border border-amber-200/20 bg-black/40 px-2 py-1 text-[12px] text-white'

export function SimulationPanel({ chainId, model, rates, tuRate, onClose }: SimulationPanelProps) {
  const [source, setSource] = useState(SPEC)
  const [issuerId, setIssuerId] = useState<number | null>(null)
  const [verifierId, setVerifierId] = useState<number | null>(null)
  const [scenario, setScenario] = useState<Scenario>(SPEC_EXAMPLE)
  const [volumes, setVolumes] = useState(DEFAULT_VOLUMES)
  const [op, setOp] = useState<Op>('issuance')

  const liveSchemas = model.raw.schemas.filter((s) => model.entities.has(`schema:${s.id}`))
  const tuSchemas = liveSchemas.filter((s) => unitOf(s) === 'TU')
  const vnaSchemas = liveSchemas.filter((s) => unitOf(s) === 'VNA')
  const otherAssets = liveSchemas.length - tuSchemas.length - vnaSchemas.length
  const schemaOption = (s: CredentialSchema) => (
    <option key={s.id} value={String(s.id)}>
      {`${model.entities.get(`schema:${s.id}`)?.name ?? `Schema ${s.id}`} #${s.id} · ${
        model.entities.get(`ecosystem:${s.ecosystem_id}`)?.name ?? `ecosystem ${s.ecosystem_id}`
      }`}
    </option>
  )
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
    const schema = liveSchemas.find((s) => s.id === id)
    const unit = schema ? unitOf(schema) : null
    if (!unit) throw new Error(`Schema #${id} is not priced in TU or VNA and cannot be simulated`)
    const issuer = first('ISSUER')
    const verifier = first('VERIFIER')
    setIssuerId(issuer)
    setVerifierId(verifier)
    setScenario(scenarioFor(model, unit, issuer, verifier))
  }

  const pickParticipants = (issuer: number | null, verifier: number | null) => {
    setIssuerId(issuer)
    setVerifierId(verifier)
    setScenario((s) => scenarioFor(model, s.unit, issuer, verifier))
  }

  const editRow = (key: 'issuance' | 'verification', rowKey: string, input: string) =>
    setScenario((s) => ({ ...s, [key]: s[key].map((row) => (row.key === rowKey ? { ...row, input } : row)) }))

  const unit = scenario.unit
  const fields: [string, string][] = [
    ['Validator validation fee', scenario.onboarding],
    ...scenario.issuance.map((row): [string, string] => [`Issuance: ${row.label} fee`, row.input]),
    ...scenario.verification.map((row): [string, string] => [`Verification: ${row.label} fee`, row.input]),
    ['Onboardings per month', volumes.onboardings],
    ['Issuances per month', volumes.issuances],
    ['Verifications per month', volumes.verifications],
  ]
  const invalid = fields.filter(([, input]) => parseAmount(input) === null).map(([label]) => label)
  const onboarding = simulateOnboarding(parseAmount(scenario.onboarding) ?? 0, rates)
  const issuance = simulateIssuance(feesOf(scenario.issuance), rates)
  const verification = simulateVerification(feesOf(scenario.verification), rates)
  const volumeNumbers: Volumes = {
    onboardings: parseAmount(volumes.onboardings) ?? 0,
    issuances: parseAmount(volumes.issuances) ?? 0,
    verifications: parseAmount(volumes.verifications) ?? 0,
  }
  const totals = monthlyTotals(onboarding, issuance, verification, volumeNumbers)
  const tu = unit === 'TU' ? tuRate : null
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
          <option value={SPEC}>VPR v4 spec example (at live rates)</option>
          {tuSchemas.length > 0 && <optgroup label="Priced in TU">{tuSchemas.map(schemaOption)}</optgroup>}
          {vnaSchemas.length > 0 && <optgroup label="Priced in VNA (uvna)">{vnaSchemas.map(schemaOption)}</optgroup>}
        </select>
      </label>
      {otherAssets > 0 && (
        <p className="mt-1 text-[11px] text-scene-mut">
          {otherAssets} schemas price fees in another asset and are not listed.
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

      <Heading>{`Fees (${unit})`}</Heading>
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

      <Heading>Volumes per month</Heading>
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

      <div data-testid="simulation-outputs">
        {invalid.length > 0 ? (
          <p role="alert" className="mt-3 text-[12px] text-[#ff8a8a]">
            {`Fix ${invalid.join(', ')}: each fee and volume must be a non-negative number.`}
          </p>
        ) : (
          <>
            <Heading>Per {active.label.toLowerCase()}</Heading>
            {op === 'onboarding' ? (
              <>
                <Line label="Applicant account" testId="payer-total">
                  <Money value={onboarding.applicant} unit={unit} tu={tu} />
                </Line>
                <Line label="Applicant trust deposit" testId="payer-deposit">
                  <Money
                    value={-onboarding.applicant - onboarding.validator.wallet - onboarding.validator.deposit}
                    unit={unit}
                    tu={tu}
                  />
                </Line>
                <SplitLine label="Validator" split={onboarding.validator} unit={unit} tu={tu} />
              </>
            ) : (
              <>
                <Line label={`${active.payer} account`} testId="payer-total">
                  <Money value={payPer.payer} unit={unit} tu={tu} />
                </Line>
                <Line label="Payer trust deposit" testId="payer-deposit">
                  <Money value={payPer.payerDeposit} unit={unit} tu={tu} />
                </Line>
                {rows.map((row) => (
                  <SplitLine
                    key={row.key}
                    label={row.label}
                    split={payPer.beneficiaries[row.key]}
                    unit={unit}
                    tu={tu}
                  />
                ))}
                <SplitLine label="User agent" split={payPer.userAgent} unit={unit} tu={tu} />
                <SplitLine label="Wallet user agent" split={payPer.walletUserAgent} unit={unit} tu={tu} />
              </>
            )}
            <Heading>Per month</Heading>
            <Line label="Paid by payers" testId="monthly-paid">
              <Money value={totals.paidByPayers} sign={false} unit={unit} tu={tu} />
            </Line>
            <Line label="Beneficiary wallet revenue">
              <Money value={totals.beneficiaryRevenue} sign={false} unit={unit} tu={tu} />
            </Line>
            <Line label="Trust deposit growth">
              <Money value={totals.depositGrowth} sign={false} unit={unit} tu={tu} />
            </Line>
            <Line label="User-agent rewards">
              <Money value={totals.agentRewards} sign={false} unit={unit} tu={tu} />
            </Line>
          </>
        )}
      </div>

      <p className="mt-3 text-[11px] text-amber-100/60">
        {unit === 'VNA'
          ? 'This schema prices fees in VNA (uvna on chain, ÷ 10⁶): simulated natively, no exchange rate involved.'
          : tu
            ? `1 TU = ${amount(tuRateValue(tu), 6)} uvna · rate #${tu.id} · updated ${tu.updated ?? 'unknown'} · expires ${tu.expires ?? 'unknown'} · /v4/exchange-rate/list on ${chainId}`
            : `No TU exchange rate on ${chainId}: amounts stay in TU.`}
      </p>
    </div>
  )
}
