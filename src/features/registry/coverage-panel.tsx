'use client'

import { useMemo } from 'react'
import type { EntityId, NetworkModel } from '@/domain/network-model'
import { formatAmount } from '@/features/inspector/entity-facts'
import { Kicker } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import { EcsBadge } from './ecs-badge'
import { type CoverageCell, coverageMatrix } from './registry-data'

const SERVICE_COLOR = '#38E1FF'
const select = (id: EntityId) => useObservatory.getState().select(id)

const unit = (n: number, word: string) => `${formatAmount(n)} ${word}${n === 1 ? '' : 's'}`

function Cell({ cell, widest }: { cell: CoverageCell; widest: number }) {
  return (
    <li className="border-b border-scene-line last:border-b-0">
      <button
        type="button"
        onClick={() => select(`schema:${cell.schemaId}`)}
        className="w-full cursor-pointer py-[5px] text-left hover:text-white"
      >
        <span className="flex justify-between gap-3">
          <span className="truncate">{cell.name}</span>
          <span className="shrink-0 text-[11px] text-scene-mut tabular-nums">
            {`${unit(cell.participants, 'participant')} · ${unit(cell.services, 'service')}`}
          </span>
        </span>
        <span aria-hidden="true" className="mt-1 block h-1 overflow-hidden rounded-full bg-white/5">
          <span
            className="block h-full rounded-full"
            style={{ width: `${(cell.services / widest) * 100}%`, background: SERVICE_COLOR }}
          />
        </span>
      </button>
    </li>
  )
}

export function CoveragePanel({ model }: { model: NetworkModel }) {
  const matrix = useMemo(() => coverageMatrix(model), [model])
  const widest = Math.max(1, ...matrix.flatMap((row) => row.cells.map((cell) => cell.services)))
  const queries = useObservatory((s) => s.queries)
  const services = model.agents.filter((agent) =>
    model.agentAnchors(agent.id).some((id) => id.startsWith('participant:'))
  ).length
  return (
    <GlassPanel
      role="complementary"
      aria-label="Coverage"
      className="fixed top-4 right-4 z-20 max-h-[calc(100vh-380px)] w-[340px] max-w-[calc(100vw-32px)] overflow-y-auto p-[18px] text-scene-txt"
    >
      <Kicker>registry · coverage</Kicker>
      <h2 className="mt-1 text-lg font-semibold tracking-[-.01em]">Ecosystems × schemas</h2>
      <p className="text-[11.5px] text-scene-mut">
        {`Per credential schema: participants accredited for it, and services (DIDs) operating those accreditations. ${unit(services, 'service')} hold at least one accreditation.`}
      </p>
      {matrix.map(({ ecosystem, cells }) => (
        <section key={ecosystem.id} aria-label={ecosystem.name} className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => select(ecosystem.id)}
              className="cursor-pointer truncate text-[12.5px] font-semibold hover:text-white"
            >
              {ecosystem.name}
            </button>
            <EcsBadge model={model} ecosystemId={ecosystem.ecosystemId} />
          </div>
          {cells.length === 0 ? (
            <p className="py-[5px] text-[12px] text-scene-mut">No credential schemas</p>
          ) : (
            <ul className="text-[12px]">
              {cells.map((cell) => (
                <Cell key={cell.schemaId} cell={cell} widest={widest} />
              ))}
            </ul>
          )}
        </section>
      ))}
      {queries.schemas && <ShowQuery query={queries.schemas} />}
    </GlassPanel>
  )
}
