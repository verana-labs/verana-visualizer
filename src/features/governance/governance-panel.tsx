'use client'

import type { ReactNode } from 'react'
import { type Constellation, formatProposalStatus, type GovernanceProposal, proposalColor } from '@/domain/governance'
import type { NetworkModel } from '@/domain/network-model'
import { Kicker } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import { useBelowHud } from '@/ui/use-below-hud'
import type { GovernanceData } from './load-governance'

export type GovernanceState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: GovernanceData }

interface GovernancePanelProps {
  chainId: string
  model: NetworkModel
  state: GovernanceState
}

const FOOTER_SPACE = 66
const ROW =
  'flex w-full cursor-pointer flex-col gap-0.5 border-b border-scene-line py-[6px] text-left last:border-b-0 hover:text-white'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3">
      <Kicker>{title}</Kicker>
      <div className="mt-1 text-[12px]">{children}</div>
    </section>
  )
}

function sourceLabel(proposal: GovernanceProposal, model: NetworkModel): string {
  if (proposal.source === 'chain') return `chain #${proposal.number}`
  const corporation = model.entities.get(`corporation:${proposal.corporationId}`)
  return `corporation #${proposal.corporationId}${corporation ? ` · ${corporation.name}` : ''}`
}

function ProposalRow({ proposal, model }: { proposal: GovernanceProposal; model: NetworkModel }) {
  const color = proposalColor(proposal)
  return (
    <button type="button" onClick={() => useObservatory.getState().select(proposal.id)} className={ROW}>
      <span className="truncate">{proposal.title}</span>
      <span className="flex justify-between gap-2 text-[11px] text-scene-mut">
        <span className="truncate">{sourceLabel(proposal, model)}</span>
        <b className="shrink-0 font-medium" style={{ color }}>
          {formatProposalStatus(proposal.status)}
        </b>
      </span>
    </button>
  )
}

function ConstellationRow({ constellation, model }: { constellation: Constellation; model: NetworkModel }) {
  const name = model.entities.get(constellation.corporation)?.name ?? constellation.corporation
  const n = constellation.members.length
  return (
    <button
      type="button"
      onClick={() => useObservatory.getState().select(constellation.corporation)}
      className="flex w-full cursor-pointer justify-between gap-3 border-b border-scene-line py-[5px] text-left last:border-b-0 hover:text-white"
    >
      <span className="truncate">{name}</span>
      <span className="shrink-0 text-scene-mut">{`${n} member${n === 1 ? '' : 's'} · weight ${constellation.totalWeight}`}</span>
    </button>
  )
}

function Ready({ chainId, model, data }: { chainId: string; model: NetworkModel; data: GovernanceData }) {
  const chain = data.proposals.filter((p) => p.source === 'chain')
  const group = data.proposals.filter((p) => p.source === 'group')
  const open = data.proposals.filter((p) => p.open).length
  return (
    <>
      {data.proposals.length === 0 ? (
        <p className="mt-1 text-[13px] font-medium">{`No proposals on ${chainId}`}</p>
      ) : (
        <p className="mt-0.5 text-[12px] text-scene-mut">
          {`${open} open · ${data.proposals.length} total · ${group.length} corporation, ${chain.length} chain`}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-scene-mut">
        Each corporation is a small constellation of its group members, orb size by voting weight. Proposals are markers
        on their corporation and pulse while voting is open. Votes arrive as comets.
      </p>
      <Section title="chain · gov/v1 proposals">
        {data.chain.status === 'error' ? (
          <p className="text-[#ff8a8a]">{`Chain proposals unavailable: ${data.chain.message}`}</p>
        ) : chain.length === 0 ? (
          <p className="text-scene-mut">{`No chain proposals on ${chainId}`}</p>
        ) : (
          chain.map((p) => <ProposalRow key={p.id} proposal={p} model={model} />)
        )}
      </Section>
      {group.length > 0 && (
        <Section title="corporation · group proposals">
          {group.map((p) => (
            <ProposalRow key={p.id} proposal={p} model={model} />
          ))}
        </Section>
      )}
      {data.constellations.length > 0 && (
        <Section title="corporation groups">
          {data.constellations.map((c) => (
            <ConstellationRow key={c.corporation} constellation={c} model={model} />
          ))}
        </Section>
      )}
      <ShowQuery query={data.queries.groupProposals} />
      {data.queries.govProposals && <ShowQuery query={data.queries.govProposals} />}
    </>
  )
}

export function GovernancePanel({ chainId, model, state }: GovernancePanelProps) {
  const top = useBelowHud()
  return (
    <GlassPanel
      aria-label="Governance"
      style={{ top, maxHeight: `calc(100vh - ${top + FOOTER_SPACE}px)` }}
      className="fixed left-4 z-10 w-[330px] max-w-[calc(100vw-32px)] overflow-y-auto p-4 text-scene-txt"
    >
      <Kicker>governance · live data</Kicker>
      <h2 className="mt-1 text-base font-semibold tracking-[-.01em]">Proposals</h2>
      {state.status === 'loading' && (
        <p className="mt-1 text-[12px] text-scene-mut">Reading group proposals, members and chain proposals…</p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="mt-1 text-[12px] text-[#ff8a8a]">
          {`Governance data unavailable: ${state.message}`}
        </p>
      )}
      {state.status === 'ready' && <Ready chainId={chainId} model={model} data={state.data} />}
    </GlassPanel>
  )
}
