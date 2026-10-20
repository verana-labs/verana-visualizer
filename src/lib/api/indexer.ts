import { z } from 'zod'
import type { NetworkConfig } from '../env'
import type { Fetched, QueryInfo } from './query-info'
import { buildUrl, type RequestOptions, requestJson, requestSignal } from './request'
import {
  blockHeightSchema,
  changesSchema,
  corporationSchema,
  credentialSchemaSchema,
  ecosystemSchema,
  eventsResponseSchema,
  exchangeRateSchema,
  groupProposalSchema,
  groupResponseSchema,
  groupVoteSchema,
  historyItemSchema,
  indexerStatusSchema,
  participantSchema,
  pendingFlatSchema,
  statsSchema,
  statsSnapshotSchema,
  trustDepositParamsSchema,
  trustDepositResponseSchema,
  trustVerdictSchema,
  verifiableTrustDidsPageSchema,
} from './schemas'

export type ListParams = Record<string, string | number | boolean | undefined>

export type HistoryKind = 'ecosystem' | 'credential-schema' | 'participant' | 'corporation'

export interface ResolveOptions {
  corporation?: boolean
  ecsCredentials?: boolean
  services?: boolean
  participations?: boolean | { states: string[] }
  presentations?: boolean | Record<string, unknown>
  ecosystems?: boolean | Record<string, unknown>
}

export interface StatsParams {
  timestamp_from: string
  timestamp_until: string
  entity_type: 'GLOBAL' | 'ECOSYSTEM' | 'CREDENTIAL_SCHEMA' | 'PARTICIPANT'
  granularity?: 'HOUR' | 'DAY' | 'MONTH'
  entity_ids?: string
  result_type?: 'BUCKETS' | 'TOTAL' | 'BUCKETS_AND_TOTAL'
}

export interface SnapshotParams {
  entity_type?: 'GLOBAL' | 'ECOSYSTEM' | 'CREDENTIAL_SCHEMA' | 'PARTICIPANT'
  entity_id?: number
}

const PAGE_SIZE = 1000
const MAX_EVENTS_LIMIT = 100

function pageOf<K extends string, S extends z.ZodType>(key: K, item: S) {
  return z.object({ [key]: z.array(item) } as Record<K, z.ZodArray<S>>).passthrough()
}

export function createIndexerClient(cfg: NetworkConfig, atHeight?: number, options: RequestOptions = {}) {
  const baseHeaders = (): Record<string, string> =>
    atHeight === undefined ? {} : { 'At-Block-Height': String(atHeight) }

  const getQuery = (path: string, params?: ListParams, headers: Record<string, string> = baseHeaders()): QueryInfo => ({
    method: 'GET',
    url: buildUrl(cfg.indexerUrl, path, params),
    headers,
  })

  async function get<T>(path: string, schema: z.ZodType<T>, params?: ListParams, headers?: Record<string, string>) {
    return requestJson(getQuery(path, params, headers), schema, requestSignal(options))
  }

  async function listAll<K extends string, S extends z.ZodType<{ id: number }>>(
    path: string,
    key: K,
    item: S,
    params: ListParams = {}
  ): Promise<Fetched<z.output<S>[]>> {
    const schema = pageOf(key, item)
    const rows: z.output<S>[] = []
    let firstQuery: QueryInfo | undefined
    let maxId: number | undefined

    for (;;) {
      const page = await get(path, schema, { ...params, limit: PAGE_SIZE, sort: '-id', max_id: maxId })
      firstQuery ??= page.query
      const items = (page.data as Record<K, z.output<S>[]>)[key]
      rows.push(...items)
      if (items.length < PAGE_SIZE) break
      const lastId = items[items.length - 1].id
      if (maxId !== undefined && lastId >= maxId) {
        throw new Error(`GET ${page.query.url} did not advance max_id past ${maxId}`)
      }
      maxId = lastId
    }

    return { data: rows, query: firstQuery as QueryInfo }
  }

  return {
    ecosystems: (params?: ListParams) => listAll('/v4/ecosystem/list', 'ecosystems', ecosystemSchema, params),
    schemas: (params?: ListParams) => listAll('/v4/credential-schema/list', 'schemas', credentialSchemaSchema, params),
    participants: (params?: ListParams) => listAll('/v4/participant/list', 'participants', participantSchema, params),
    corporations: (params?: ListParams) => listAll('/v4/corporation/list', 'corporations', corporationSchema, params),

    async dids(corporationId?: number): Promise<Fetched<{ atBlock: number; dids: string[] }>> {
      let firstQuery: QueryInfo | undefined
      const dids: string[] = []
      let atBlock = 0
      let cursor: string | undefined
      do {
        const page = await get('/v4/verifiable-trust/dids', verifiableTrustDidsPageSchema, {
          limit: 10000,
          cursor,
          corporation_id: corporationId,
        })
        firstQuery ??= page.query
        atBlock = page.data.atBlock
        dids.push(...page.data.dids)
        cursor = page.data.nextCursor ?? undefined
      } while (cursor)
      return { data: { atBlock, dids }, query: firstQuery as QueryInfo }
    },

    async trustDeposit(corpId: number) {
      const res = await get(`/v4/trust-deposit/get/${corpId}`, trustDepositResponseSchema)
      return { data: res.data.trust_deposit, query: res.query }
    },

    trustDepositHistory: (corpId: number) =>
      listAll(`/v4/trust-deposit/history/${corpId}`, 'activity', historyItemSchema),

    entityHistory: (kind: HistoryKind, id: number) =>
      listAll(`/v4/${kind}/history/${id}`, 'activity', historyItemSchema),

    resolve(did: string, opts: ResolveOptions = {}, signal?: AbortSignal) {
      const query: QueryInfo = {
        method: 'POST',
        url: buildUrl(cfg.indexerUrl, '/v4/verifiable-trust/resolve'),
        headers: { 'content-type': 'application/json', ...baseHeaders() },
        body: { did, ...opts },
      }
      return requestJson(query, trustVerdictSchema, requestSignal(options, signal))
    },

    async events(afterHeight: number, limit: number) {
      if (limit > MAX_EVENTS_LIMIT) throw new Error(`events limit must be <= ${MAX_EVENTS_LIMIT}`)
      const res = await get('/v4/indexer/events', eventsResponseSchema, { after_block_height: afterHeight, limit })
      return { data: res.data.events, query: res.query }
    },

    changes: (height: number) =>
      get('/v4/indexer/changes', changesSchema, undefined, { ...baseHeaders(), 'At-Block-Height': String(height) }),

    stats: (params: StatsParams) => get('/v4/stats/stats', statsSchema, { ...params }),
    snapshot: (params: SnapshotParams = {}) => get('/v4/stats/snapshot', statsSnapshotSchema, { ...params }),
    blockHeight: () => get('/v4/indexer/block-height', blockHeightSchema),

    groupProposals: (params?: ListParams) => listAll('/v4/group/proposals', 'proposals', groupProposalSchema, params),
    groupVotes: (proposalId: number) =>
      listAll('/v4/group/votes', 'votes', groupVoteSchema, { proposal_id: proposalId }),
    async groupMembers(corpId: number) {
      const res = await get(`/v4/group/get/${corpId}`, groupResponseSchema)
      return { data: res.data.group, query: res.query }
    },

    exchangeRates: () => listAll('/v4/exchange-rate/list', 'exchange_rates', exchangeRateSchema),
    tdParams: () => get('/v4/trust-deposit/params', trustDepositParamsSchema),
    pendingFlat: (corpId: number) => get('/v4/participant/pending/flat', pendingFlatSchema, { corporation_id: corpId }),
    health: () => get('/v4/indexer/status', indexerStatusSchema),
  }
}

export type IndexerClient = ReturnType<typeof createIndexerClient>
