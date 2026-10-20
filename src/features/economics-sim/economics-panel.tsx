'use client'

import type { ReactNode } from 'react'
import { liveTuRate } from '@/domain/economics'
import type { NetworkModel } from '@/domain/network-model'
import { isRole } from '@/domain/roles'
import { ROLE_LABELS } from '@/features/inspector/entity-facts'
import { Kicker } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import type { CredentialSchema, Participant } from '@/lib/api/schemas'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'
import { Sparkline } from '@/ui/sparkline'
import { amount, percent, vnaFromUvna } from './format'
import type { EconomicsData } from './load-economics'

export type EconomicsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: EconomicsData; now?: Date }

interface EconomicsPanelProps {
  chainId: string
  model: NetworkModel
  state: EconomicsState
  onOpenSimulation: () => void
}

const GOLD = '#fbbf24'
const SLASH_RED = '#ff6b8b'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      <Kicker>{title}</Kicker>
      <div className="mt-1 text-[12px]">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-scene-line py-[5px] last:border-b-0">
      <span className="truncate text-scene-mut">{label}</span>
      <b className="shrink-0 font-medium tabular-nums">{children}</b>
    </div>
  )
}

function priced(value: number | string, schema: CredentialSchema | undefined): string {
  const n = Number(value)
  if (schema?.pricing_asset_type === 'TU') return `${amount(n)} TU`
  if (schema?.pricing_asset_type === 'COIN' && schema.pricing_asset === 'uvna') return vnaFromUvna(n)
  return `${amount(n)} ${schema?.pricing_asset ?? schema?.pricing_asset_type ?? ''}`.trim()
}

const charges = (p: Participant) =>
  Number(p.validation_fees) > 0 || Number(p.issuance_fees) > 0 || Number(p.verification_fees) > 0

const day = (timestamp: string) => timestamp.slice(0, 10)

function Ready({
  chainId,
  model,
  data,
  now,
}: {
  chainId: string
  model: NetworkModel
  data: EconomicsData
  now: Date
}) {
  const held = [...data.deposits.values()].flatMap((d) => (d && Number(d.deposit) > 0 ? [d] : []))
  const total = held.reduce((sum, d) => sum + Number(d.deposit), 0)
  const schemas = new Map(model.raw.schemas.map((s) => [s.id, s]))
  const feeRules = model.raw.participants.filter((p) => model.entities.has(`participant:${p.id}`) && charges(p))
  const weights = data.series.map((p) => p.weight)
  const slashes = data.series.map((p) => p.slashed)
  const tu = liveTuRate(data.exchangeRates, now)

  return (
    <>
      {held.length === 0 ? (
        <p className="mt-1 text-[13px] font-medium">{`No trust deposits on ${chainId}`}</p>
      ) : (
        <>
          <div
            data-testid="deposit-total"
            className="mt-0.5 text-xl font-semibold tabular-nums"
            style={{ color: GOLD }}
          >
            {vnaFromUvna(total)}
          </div>
          <p className="text-[11.5px] text-scene-mut">
            {`${held.length} corporation${held.length === 1 ? '' : 's'} hold a trust deposit`}
          </p>
          <div className="mt-1 text-[12px]">
            {held.map((d) => (
              <Row
                key={d.corporation_id}
                label={model.entities.get(`corporation:${d.corporation_id}`)?.name ?? `Corporation ${d.corporation_id}`}
              >
                {vnaFromUvna(Number(d.deposit))}
                {Number(d.slashed_deposit) > 0 && (
                  <span className="ml-1.5 text-[11px]" style={{ color: SLASH_RED }}>
                    {`−${vnaFromUvna(Number(d.slashed_deposit))} slashed`}
                  </span>
                )}
              </Row>
            ))}
          </div>
        </>
      )}
      <p className="mt-1.5 text-[11px] text-scene-mut">
        Orb size follows the trust deposit (log scale); orbs without a deposit record keep their base size. Gold rings
        fill with each ecosystem’s trust weight. Gold comets are real trust-deposit transactions.
      </p>

      <Section title="history · indexer stats, daily">
        {data.series.length < 2 ? (
          <p className="text-scene-mut">
            {data.series.length === 0
              ? 'No stats buckets yet.'
              : `One day of stats so far (${day(data.series[0].timestamp)}).`}
          </p>
        ) : (
          <>
            {weights.every((w) => w === 0) ? (
              <p className="text-scene-mut">{`No trust weight recorded since ${day(data.series[0].timestamp)}.`}</p>
            ) : (
              <>
                <figure aria-label="Cumulative trust weight" className="flex items-center justify-between gap-3">
                  <figcaption className="text-scene-mut">Cumulative trust weight</figcaption>
                  <Sparkline values={weights} width={110} height={26} color={GOLD} drawIn />
                </figure>
                <div className="text-right text-[10.5px] text-scene-mut">
                  {`${day(data.series[0].timestamp)} → ${day(data.series.at(-1)?.timestamp ?? '')} · now ${amount(weights.at(-1) ?? 0)}`}
                </div>
              </>
            )}
            {slashes.every((s) => s === 0) ? (
              <p className="mt-1 text-scene-mut">{`No slashes recorded since ${day(data.series[0].timestamp)}.`}</p>
            ) : (
              <figure aria-label="Cumulative slashed amount" className="mt-1 flex items-center justify-between gap-3">
                <figcaption className="text-scene-mut">Cumulative slashed</figcaption>
                <Sparkline values={slashes} width={110} height={26} color={SLASH_RED} drawIn />
              </figure>
            )}
          </>
        )}
      </Section>

      <Section title="fee rules · participants">
        {feeRules.length === 0 ? (
          <p className="text-scene-mut">{`No participant on ${chainId} charges fees yet.`}</p>
        ) : (
          feeRules.map((p) => {
            const schema = schemas.get(p.schema_id)
            const name = model.entities.get(`participant:${p.id}`)?.name ?? `Participant ${p.id}`
            return (
              <div key={p.id} className="border-b border-scene-line py-[5px] last:border-b-0">
                <div className="truncate">
                  {`${name} #${p.id} · ${isRole(p.role) ? ROLE_LABELS[p.role] : p.role}`}
                  <span className="text-scene-mut">{` · ${model.entities.get(`schema:${p.schema_id}`)?.name ?? `schema ${p.schema_id}`}`}</span>
                </div>
                <div className="text-[11px] text-scene-mut">
                  {`validation ${priced(p.validation_fees, schema)} · issuance ${priced(p.issuance_fees, schema)} · verification ${priced(p.verification_fees, schema)}`}
                </div>
              </div>
            )
          })
        )}
      </Section>

      <Section title="td params · live">
        <p>
          {`trust_deposit_rate ${percent(data.rates.trustDepositRate)} · user_agent_reward_rate ${percent(data.rates.userAgentRewardRate)} · wallet_user_agent_reward_rate ${percent(data.rates.walletUserAgentRewardRate)}`}
        </p>
        <p className="mt-0.5 text-scene-mut">
          {tu
            ? `1 TU = ${amount(tu.rate / 10 ** tu.scale, 6)} uvna · exchange rate #${tu.id}, updated ${tu.updated ?? 'unknown'}`
            : `No TU exchange rate published on ${chainId}.`}
        </p>
      </Section>
      <ShowQuery query={data.queries.tdParams} />
    </>
  )
}

export function EconomicsPanel({ chainId, model, state, onOpenSimulation }: EconomicsPanelProps) {
  return (
    <GlassPanel
      aria-label="Economics"
      className="fixed bottom-[66px] left-4 z-10 max-h-[calc(100vh-330px)] w-[330px] max-w-[calc(100vw-32px)] overflow-y-auto p-4 text-scene-txt"
    >
      <Kicker>economics · live data</Kicker>
      <h2 className="mt-1 text-base font-semibold tracking-[-.01em]">Trust deposits</h2>
      {state.status === 'loading' && (
        <p className="mt-1 text-[12px] text-scene-mut">Reading trust deposits, td params and stats…</p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="mt-1 text-[12px] text-[#ff8a8a]">
          {`Economics data unavailable: ${state.message}`}
        </p>
      )}
      {state.status === 'ready' && (
        <Ready chainId={chainId} model={model} data={state.data} now={state.now ?? new Date()} />
      )}
      <Button
        onClick={onOpenSimulation}
        disabled={state.status !== 'ready'}
        className="mt-3 w-full !border-dashed !border-amber-400/60 !bg-amber-400/10 text-amber-100 hover:!bg-amber-400/20"
      >
        Open what-if simulator
      </Button>
    </GlassPanel>
  )
}
