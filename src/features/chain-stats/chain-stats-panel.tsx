'use client'

import { amount } from '@/features/economics-sim/format'
import { Kicker } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import type { QueryInfo } from '@/lib/api/query-info'
import { GlassPanel } from '@/ui/glass-panel'
import { FOOTER_SPACE, useBelowHud } from '@/ui/use-below-hud'
import type { ValidatorOrb } from './chain-scene'
import type { StatRow } from './load-chain-stats'

export type ValidatorsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; orbs: ValidatorOrb[]; query?: QueryInfo }

interface ChainStatsPanelProps {
  chainId: string
  rows: StatRow[]
  validators: ValidatorsState
}

function StatValue({ row }: { row: StatRow }) {
  if (row.state === 'loading') return <span className="text-scene-mut">…</span>
  if (row.state === 'unavailable')
    return (
      <span title={row.reason} className="text-[#ff8a8a]">
        unavailable
      </span>
    )
  return <>{row.value}</>
}

function Stat({ row }: { row: StatRow }) {
  return (
    <div data-stat={row.id} className="border-b border-scene-line py-[6px] last:border-b-0">
      <div className="flex justify-between gap-3">
        <span>{row.label}</span>
        <b className="shrink-0 text-right font-medium tabular-nums">
          <StatValue row={row} />
        </b>
      </div>
      <div className="text-[10.5px] text-scene-mut">{row.definition}</div>
      {row.detail && <div className="text-[10.5px] text-scene-mut">{row.detail}</div>}
    </div>
  )
}

function Validators({ state }: { state: ValidatorsState }) {
  if (state.status === 'loading') return <p className="text-scene-mut">Reading validators…</p>
  if (state.status === 'error')
    return (
      <p role="alert" className="text-[#ff8a8a]">
        {`Validators unavailable: ${state.message}`}
      </p>
    )
  return (
    <>
      {state.orbs.map((orb) => (
        <div
          key={orb.address}
          className="flex justify-between gap-3 border-b border-scene-line py-[5px] last:border-b-0"
        >
          <span className="truncate">
            {orb.moniker}
            {!orb.active && <span className="text-scene-mut"> · not bonded</span>}
          </span>
          <b className="shrink-0 font-medium tabular-nums">{`${amount(orb.share * 100, 2)}%`}</b>
        </div>
      ))}
      {state.query && <ShowQuery query={state.query} />}
    </>
  )
}

export function ChainStatsPanel({ chainId, rows, validators }: ChainStatsPanelProps) {
  const top = useBelowHud()
  const blockQuery = rows.find((r) => r.id === 'blockHeight')?.query
  return (
    <GlassPanel
      role="region"
      aria-label="Chain"
      style={{ top, maxHeight: `calc(100vh - ${top + FOOTER_SPACE}px)` }}
      className="fixed left-4 z-10 w-[330px] max-w-[calc(100vw-32px)] overflow-y-auto p-4 text-scene-txt"
    >
      <Kicker>{`chain · ${chainId} · live data`}</Kicker>
      <h2 className="mt-1 text-base font-semibold tracking-[-.01em]">Network health at a glance</h2>
      <div className="mt-2 text-[12px]">
        {rows.map((row) => (
          <Stat key={row.id} row={row} />
        ))}
      </div>
      {blockQuery && <ShowQuery query={blockQuery} />}
      <section className="mt-3">
        <Kicker>validators · voting power</Kicker>
        <div className="mt-1 text-[12px]">
          <Validators state={validators} />
        </div>
      </section>
    </GlassPanel>
  )
}
