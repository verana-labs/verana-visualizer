import type { EntityId, NetworkModel } from '@/domain/network-model'
import { participantState } from '@/domain/participant-state'
import type { TrustCheck, TrustHop, TrustVerdictOutcome } from '@/domain/trust-check'
import type { GraphClient } from '@/lib/api/graph'
import type { IndexerClient } from '@/lib/api/indexer'
import type { Participant } from '@/lib/api/schemas'
import { FetchError } from '@/lib/fetch-json'
import { logger } from '@/lib/logger'

export interface TrustClients {
  indexer: Pick<IndexerClient, 'resolve'>
  graph: Pick<GraphClient, 'validatorChain'> | null
}

type ChainNode = Awaited<ReturnType<GraphClient['validatorChain']>>['data'][number]

interface PathResult {
  path: EntityId[]
  source: TrustCheck['pathSource']
  error: string | null
  graph: ChainNode[] | null
}

export function describeFailure(error: unknown): string {
  if (error instanceof FetchError && error.status !== null) return `HTTP ${error.status} from ${error.url}`
  return error instanceof Error ? error.message : String(error)
}

function rawParticipantOf(model: NetworkModel, id: EntityId): Participant | undefined {
  if (!id.startsWith('participant:')) return undefined
  const numeric = Number(id.slice('participant:'.length))
  return model.raw.participants.find((p) => p.id === numeric)
}

function participantsOf(model: NetworkModel, did: string): Participant[] {
  return model.byDid(did).flatMap((id) => rawParticipantOf(model, id) ?? [])
}

function subjectParticipant(model: NetworkModel, did: string): Participant | null {
  const candidates = participantsOf(model, did).map((p) => ({
    p,
    depth: model.chainToRoot(`participant:${p.id}`).length,
  }))
  candidates.sort((a, b) => b.depth - a.depth || a.p.id - b.p.id)
  return candidates[0]?.p ?? null
}

function localPath(model: NetworkModel | null, did: string, participant: Participant | null): EntityId[] {
  if (!model) return []
  const holders = model.byDid(did)
  const agent = holders.find((id) => id.startsWith('agent:'))
  const start = participant ? (`participant:${participant.id}` as EntityId) : holders.find((id) => id !== agent)
  return [...(agent ? [agent] : []), ...(start ? model.chainToRoot(start) : [])]
}

async function findPath(did: string, model: NetworkModel | null, graph: TrustClients['graph']): Promise<PathResult> {
  const participant = model ? subjectParticipant(model, did) : null
  const local = (error: string | null): PathResult => ({
    path: localPath(model, did, participant),
    source: 'local',
    error,
    graph: null,
  })
  if (!model || !participant || !graph) return local(null)
  try {
    const { data } = await graph.validatorChain(participant.id)
    const root = data[0]
    if (!root) throw new Error(`verana-graph G1 returned an empty chain for participant ${participant.id}`)
    const agent = model.byDid(did).find((id) => id.startsWith('agent:'))
    const chain = [...data].reverse().map((node): EntityId => `participant:${node.id}`)
    const ecosystem: EntityId[] = root.ecosystemId == null ? [] : [`ecosystem:${root.ecosystemId}`]
    return {
      path: [...(agent ? [agent] : []), ...chain, ...ecosystem],
      source: 'verana-graph G1',
      error: null,
      graph: data,
    }
  } catch (error) {
    const message = describeFailure(error)
    logger.warn(`Trust path for ${did}: verana-graph G1 failed, using the loaded network instead`, message)
    return local(message)
  }
}

async function findVerdict(
  did: string,
  indexer: TrustClients['indexer']
): Promise<{ verdict: TrustVerdictOutcome; raw: unknown }> {
  try {
    const { data } = await indexer.resolve(did)
    if (data.did !== did) throw new Error('Indexer returned a verdict for a different DID')
    return {
      verdict: {
        trusted: data.trusted,
        evaluatedAtBlock: data.evaluatedAtBlock ?? null,
        evaluatedAtTime: data.evaluatedAtTime ?? null,
        expiresAtTime: data.expiresAtTime ?? null,
      },
      raw: data,
    }
  } catch (error) {
    const message = describeFailure(error)
    logger.error(`Trust verdict for ${did} could not be resolved`, message)
    return { verdict: { error: message }, raw: null }
  }
}

function hopsOf(model: NetworkModel | null, path: EntityId[], graph: ChainNode[] | null, now: Date): TrustHop[] {
  return path.flatMap((id): TrustHop[] => {
    if (!id.startsWith('participant:')) return []
    const p = model ? rawParticipantOf(model, id) : undefined
    const node = graph?.find((n) => `participant:${n.id}` === id)
    const state = p ? participantState(p, now) : (node?.state ?? 'UNKNOWN')
    return [{ id, state, opState: p?.op_state ?? null }]
  })
}

export async function runTrustCheck(
  did: string,
  model: NetworkModel | null,
  clients: TrustClients,
  now: Date = new Date()
): Promise<TrustCheck> {
  const [found, resolved] = await Promise.all([findPath(did, model, clients.graph), findVerdict(did, clients.indexer)])
  return {
    did,
    path: found.path,
    pathSource: found.source,
    pathError: found.error,
    hops: hopsOf(model, found.path, found.graph, now),
    sharedBy: model ? participantsOf(model, did).length : 0,
    verdict: resolved.verdict,
    raw: { resolve: resolved.raw, graph: found.graph },
  }
}
