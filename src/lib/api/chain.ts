import { z } from 'zod'
import type { NetworkConfig } from '../env'
import type { Fetched, QueryInfo } from './query-info'
import { buildUrl, requestJson } from './request'
import {
  blockSchema,
  communityPoolSchema,
  govProposalsPageSchema,
  govTallySchema,
  inflationSchema,
  rpcStatusSchema,
  stakingPoolSchema,
  supplyPageSchema,
  validatorsPageSchema,
} from './schemas'

const PAGE_SIZE = 200

interface KeyedPage {
  pagination?: { next_key?: string | null } | null
}

export function createChainClient(cfg: NetworkConfig) {
  const getRest = <T>(path: string, schema: z.ZodType<T>, params?: Record<string, string | number | undefined>) =>
    requestJson<T>({ method: 'GET', url: buildUrl(cfg.restUrl, path, params), headers: {} }, schema)

  async function pageAll<P extends KeyedPage, I>(
    path: string,
    schema: z.ZodType<P>,
    pick: (page: P) => I[]
  ): Promise<Fetched<I[]>> {
    const rows: I[] = []
    let firstQuery: QueryInfo | undefined
    let key: string | undefined
    do {
      const page = await getRest(path, schema, { 'pagination.limit': PAGE_SIZE, 'pagination.key': key })
      firstQuery ??= page.query
      rows.push(...pick(page.data))
      key = page.data.pagination?.next_key ?? undefined
    } while (key)
    return { data: rows, query: firstQuery as QueryInfo }
  }

  return {
    supply: () => pageAll('/cosmos/bank/v1beta1/supply', supplyPageSchema, (page) => page.supply),
    inflation: () => getRest('/cosmos/mint/v1beta1/inflation', inflationSchema),
    stakingPool: () => getRest('/cosmos/staking/v1beta1/pool', stakingPoolSchema),
    communityPool: () => getRest('/cosmos/protocolpool/v1/community_pool', communityPoolSchema),
    validators: () => pageAll('/cosmos/staking/v1beta1/validators', validatorsPageSchema, (page) => page.validators),
    govProposals: () => pageAll('/cosmos/gov/v1/proposals', govProposalsPageSchema, (page) => page.proposals),
    govTally: (id: number) => getRest(`/cosmos/gov/v1/proposals/${id}/tally`, govTallySchema),
    latestBlock: () => getRest('/cosmos/base/tendermint/v1beta1/blocks/latest', blockSchema),
    block: (height: number) => getRest(`/cosmos/base/tendermint/v1beta1/blocks/${height}`, blockSchema),
    status: () => requestJson({ method: 'GET', url: buildUrl(cfg.rpcUrl, '/status'), headers: {} }, rpcStatusSchema),
  }
}

export type ChainClient = ReturnType<typeof createChainClient>
