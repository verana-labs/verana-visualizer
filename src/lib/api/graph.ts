import type { NetworkConfig } from '../env'
import type { QueryInfo } from './query-info'
import { buildUrl, requestJson } from './request'
import { graphHealthSchema, searchResponseSchema, traverseResponseSchema, validatorChainSchema } from './schemas'

export type TraversalQuery =
  | 'A1'
  | 'A2'
  | 'A3'
  | 'A4'
  | 'A5'
  | 'A6'
  | 'A7'
  | 'B1'
  | 'B2'
  | 'C1'
  | 'C2'
  | 'C3'
  | 'D1'
  | 'D2'
  | 'E1'
  | 'E2'
  | 'E3'
  | 'F1'
  | 'G1'

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

export function createGraphClient(cfg: NetworkConfig) {
  const post = (path: string, body: unknown): QueryInfo => ({
    method: 'POST',
    url: buildUrl(cfg.graphUrl, path),
    headers: JSON_HEADERS,
    body,
  })

  const traverseQuery = (query: TraversalQuery, input: Record<string, unknown>, limit?: number) =>
    post('/v4/graph/traverse', { query, input, ...(limit === undefined ? {} : { limit }) })

  return {
    traverse: (query: TraversalQuery, input: Record<string, unknown>, limit?: number) =>
      requestJson(traverseQuery(query, input, limit), traverseResponseSchema),
    async validatorChain(participantId: number) {
      const res = await requestJson(
        traverseQuery('G1', { participantId }),
        traverseResponseSchema.extend({ output: validatorChainSchema })
      )
      return { data: res.data.output, query: res.query }
    },
    search: (params: SearchParams) => requestJson(post('/v4/graph/search', params), searchResponseSchema),
    health: () =>
      requestJson({ method: 'GET', url: buildUrl(cfg.graphUrl, '/health'), headers: {} }, graphHealthSchema),
  }
}

export type GraphClient = ReturnType<typeof createGraphClient>
