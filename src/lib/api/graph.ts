import type { z } from 'zod'
import type { NetworkConfig } from '../env'
import type { QueryInfo } from './query-info'
import { buildUrl, type RequestOptions, requestJson, requestSignal } from './request'
import { graphHealthSchema, searchResponseSchema, traverseResponseSchema, validatorChainSchema } from './schemas'

export type TraversalQuery = 'G1'

export type SearchSurface = 'Did' | 'Ecosystem' | 'Corporation' | 'CredentialSchema' | 'ServiceEndpoint'

export interface SearchParams {
  surface: SearchSurface
  filters?: Record<string, unknown>
  freeText?: string
  snippet?: Record<string, boolean>
  limit?: number
  cursor?: string | null
  includeUntrusted?: boolean
}

const JSON_HEADERS = { 'content-type': 'application/json' }

const TRAVERSAL_OUTPUT = { G1: validatorChainSchema } satisfies Record<TraversalQuery, z.ZodType>

export function createGraphClient(cfg: NetworkConfig, options: RequestOptions = {}) {
  const post = (path: string, body: unknown): QueryInfo => ({
    method: 'POST',
    url: buildUrl(cfg.graphUrl, path),
    headers: JSON_HEADERS,
    body,
  })

  const traverse = (query: TraversalQuery, input: Record<string, unknown>, limit?: number) =>
    requestJson(
      post('/v4/graph/traverse', { query, input, ...(limit === undefined ? {} : { limit }) }),
      traverseResponseSchema.extend({ output: TRAVERSAL_OUTPUT[query] }),
      requestSignal(options)
    )

  return {
    traverse,
    async validatorChain(participantId: number) {
      const res = await traverse('G1', { participantId })
      return { data: res.data.output, query: res.query }
    },
    search: (params: SearchParams) =>
      requestJson(post('/v4/graph/search', params), searchResponseSchema, requestSignal(options)),
    health: () =>
      requestJson({ method: 'GET', url: buildUrl(cfg.graphUrl, '/health'), headers: {} }, graphHealthSchema),
  }
}

export type GraphClient = ReturnType<typeof createGraphClient>
