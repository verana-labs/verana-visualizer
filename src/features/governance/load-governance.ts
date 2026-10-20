import {
  type Constellation,
  corporationConstellations,
  fromGovProposal,
  fromGroupProposal,
  type GovernanceProposal,
} from '@/domain/governance'
import type { ChainClient } from '@/lib/api/chain'
import type { IndexerClient } from '@/lib/api/indexer'
import type { QueryInfo } from '@/lib/api/query-info'
import type { Group, GroupVote } from '@/lib/api/schemas'
import { FetchError } from '@/lib/fetch-json'

export interface GovernanceData {
  proposals: GovernanceProposal[]
  constellations: Constellation[]
  chain: { status: 'ready' } | { status: 'error'; message: string }
  queries: { groupProposals: QueryInfo; govProposals: QueryInfo | null }
}

const GROUP_CONCURRENCY = 4

async function groupsOf(indexer: Pick<IndexerClient, 'groupMembers'>, corporationIds: readonly number[]) {
  const groups = new Map<number, Group>()
  let next = 0
  const worker = async () => {
    while (next < corporationIds.length) {
      const id = corporationIds[next++]
      try {
        groups.set(id, (await indexer.groupMembers(id)).data)
      } catch (error) {
        if (!(error instanceof FetchError && error.status === 404)) throw error
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(GROUP_CONCURRENCY, corporationIds.length) }, worker))
  return corporationIds.flatMap((id) => groups.get(id) ?? [])
}

export async function loadGovernance(
  indexer: Pick<IndexerClient, 'groupProposals' | 'groupMembers'>,
  chain: Pick<ChainClient, 'govProposals'>,
  corporationIds: readonly number[]
): Promise<GovernanceData> {
  const [group, gov, groups] = await Promise.all([
    indexer.groupProposals(),
    chain.govProposals().then(
      (res) => ({ ok: true as const, res }),
      (error: unknown) => ({ ok: false as const, message: error instanceof Error ? error.message : String(error) })
    ),
    groupsOf(indexer, corporationIds),
  ])
  const chainProposals = gov.ok ? gov.res.data.map(fromGovProposal).sort((a, b) => b.number - a.number) : []
  return {
    proposals: [...chainProposals, ...group.data.map(fromGroupProposal)],
    constellations: corporationConstellations(groups),
    chain: gov.ok ? { status: 'ready' } : { status: 'error', message: gov.message },
    queries: { groupProposals: group.query, govProposals: gov.ok ? gov.res.query : null },
  }
}

export async function loadVotes(
  indexer: Pick<IndexerClient, 'groupVotes'>,
  proposalNumber: number
): Promise<{ votes: GroupVote[]; query: QueryInfo }> {
  const res = await indexer.groupVotes(proposalNumber)
  return { votes: res.data, query: res.query }
}
