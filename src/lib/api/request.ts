import type { z } from 'zod'
import { fetchJson } from '../fetch-json'
import type { Fetched, QueryInfo } from './query-info'

type Param = string | number | boolean | undefined | null

export function buildUrl(base: string, path: string, params: Record<string, Param> = {}): string {
  const search = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(name, String(value))
  }
  const query = search.toString()
  return `${base}${path}${query ? `?${query}` : ''}`
}

export async function requestJson<T>(query: QueryInfo, schema: z.ZodType<T>): Promise<Fetched<T>> {
  const init: RequestInit = { method: query.method, headers: query.headers }
  if (query.body !== undefined) init.body = JSON.stringify(query.body)
  const data = await fetchJson(query.url, init, schema)
  return { data, query }
}
