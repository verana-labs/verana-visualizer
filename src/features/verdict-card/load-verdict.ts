import { buildNetworkModel, type NetworkModel, type RawNetwork } from '@/domain/network-model'
import type { TrustCheck } from '@/domain/trust-check'
import { describeFailure, runTrustCheck } from '@/features/trust-check/run-trust-check'
import { describePath, type HopInfo } from '@/features/trust-check/trust-chain'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient, type IndexerClient } from '@/lib/api/indexer'
import type { Participant } from '@/lib/api/schemas'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

export const SERVER_TIMEOUT_MS = 8000
const DID_PARAM = /^did:[a-z0-9]+:\S+$/

export interface VerdictCardData {
  check: TrustCheck
  hops: Record<string, HopInfo>
  subjectName: string | null
  block: number | null
  networkError: string | null
}

export type BlockParam = { block: number | null } | { invalid: string }

export function parseBlock(value: string | string[] | undefined): BlockParam {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === undefined) return { block: null }
  const block = /^\d+$/.test(raw) ? Number(raw) : Number.NaN
  return Number.isSafeInteger(block) && block > 0 ? { block } : { invalid: raw }
}

export function decodeDid(param: string): string | null {
  let did: string
  try {
    did = decodeURIComponent(param)
  } catch {
    return null
  }
  return DID_PARAM.test(did) ? did : null
}

async function loadSubjectNetwork(indexer: IndexerClient, did: string): Promise<RawNetwork> {
  const [ecosystems, subject] = await Promise.all([indexer.ecosystems(), indexer.participants({ did })])
  const participants = new Map<number, Participant>(subject.data.map((p) => [p.id, p]))
  let missing = [...participants.values()].flatMap((p) => p.validator_participant_id ?? [])
  while (missing.length > 0) {
    const wanted = [...new Set(missing)].filter((id) => !participants.has(id))
    const pages = await Promise.all(wanted.map((id) => indexer.participants({ participant_id: id })))
    const found = pages.flatMap((page) => page.data).filter((p) => !participants.has(p.id))
    for (const p of found) participants.set(p.id, p)
    missing = found.flatMap((p) => p.validator_participant_id ?? [])
  }
  return {
    ecosystems: ecosystems.data,
    schemas: [],
    participants: [...participants.values()],
    corporations: [],
    dids: [did],
  }
}

export async function loadVerdict(
  cfg: NetworkConfig,
  did: string,
  block: number | null,
  { timeoutMs = SERVER_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<VerdictCardData> {
  const atHeight = block ?? undefined
  const indexer = createIndexerClient(cfg, atHeight, { timeoutMs })
  const resolving = indexer.resolve(did).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error })
  )
  let model: NetworkModel | null = null
  let networkError: string | null = null
  try {
    model = buildNetworkModel(await loadSubjectNetwork(indexer, did))
  } catch (error) {
    networkError = describeFailure(error)
    logger.warn(`Verdict card for ${did}: the trust chain could not be loaded`, networkError)
  }
  const check = await runTrustCheck(did, model, {
    indexer: {
      resolve: async () => {
        const settled = await resolving
        if (!settled.ok) throw settled.error
        return settled.value
      },
    },
    graph: block === null ? createGraphClient(cfg, { timeoutMs }) : null,
  })
  const subject = model?.byDid(did)[0]
  return {
    check,
    hops: describePath(model, check),
    subjectName: subject ? (model?.entities.get(subject)?.name ?? null) : null,
    block,
    networkError,
  }
}
