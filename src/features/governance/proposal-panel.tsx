'use client'

import type { Entity, NetworkModel } from '@/domain/network-model'
import { Kicker } from '@/features/inspector/entity-parts'
import { useObservatory } from '@/store/observatory-store'
import { ProposalDetails } from './proposal-details'

const IDLE = { status: 'idle' } as const

export function ProposalPanel({ model, entity, chainId }: { model: NetworkModel; entity: Entity; chainId: string }) {
  const governance = useObservatory((s) => s.governance)
  const blockHeight = useObservatory((s) => s.blockHeight)
  const proposal = governance?.proposals.get(entity.id)
  if (!governance || !proposal)
    return (
      <>
        <Kicker>{entity.id}</Kicker>
        <h2 className="mt-1 mb-0.5 text-lg font-semibold">{`Not found on ${chainId}`}</h2>
      </>
    )
  return (
    <ProposalDetails
      model={model}
      proposal={proposal}
      votes={governance.votes.get(entity.id) ?? IDLE}
      query={proposal.source === 'group' ? governance.queries.groupProposals : governance.queries.govProposals}
      blockHeight={blockHeight}
    />
  )
}
