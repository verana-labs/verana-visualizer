import { buildNetworkModel, type NetworkModel } from '@/domain/network-model'
import type { TrustCheck } from '@/domain/trust-check'
import { describeFailure, runTrustCheck } from '@/features/trust-check/run-trust-check'
import { describePath, type HopInfo } from '@/features/trust-check/trust-chain'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import { loadRawNetwork } from '@/lib/api/load-network'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

export interface VerdictCardData {
  check: TrustCheck
  hops: Record<string, HopInfo>
  subjectName: string | null
  block: number | null
  networkError: string | null
}

export function parseBlock(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw || !/^\d+$/.test(raw)) return null
  const block = Number(raw)
  return Number.isSafeInteger(block) && block > 0 ? block : null
}

export function decodeDid(param: string): string {
  try {
    return decodeURIComponent(param)
  } catch {
    return param
  }
}

export async function loadVerdict(cfg: NetworkConfig, did: string, block: number | null): Promise<VerdictCardData> {
  const atHeight = block ?? undefined
  let model: NetworkModel | null = null
  let networkError: string | null = null
  try {
    model = buildNetworkModel((await loadRawNetwork(cfg, atHeight)).raw)
  } catch (error) {
    networkError = describeFailure(error)
    logger.warn(`Verdict card for ${did}: the network could not be loaded, so the path is unavailable`, networkError)
  }
  const check = await runTrustCheck(did, model, {
    indexer: createIndexerClient(cfg, atHeight),
    graph: block === null ? createGraphClient(cfg) : null,
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
