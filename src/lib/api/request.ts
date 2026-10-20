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

export interface RequestOptions {
  timeoutMs?: number
  signal?: AbortSignal
  revalidateSeconds?: number
}

export function requestSignal(options: RequestOptions, signal?: AbortSignal): AbortSignal | undefined {
  const timeout = options.timeoutMs === undefined ? undefined : AbortSignal.timeout(options.timeoutMs)
  const signals = [timeout, options.signal, signal].filter((s): s is AbortSignal => s !== undefined)
  return signals.length > 1 ? AbortSignal.any(signals) : signals[0]
}

export async function requestJson<T>(
  query: QueryInfo,
  schema: z.ZodType<T>,
  signal?: AbortSignal,
  via?: string,
  revalidateSeconds?: number
): Promise<Fetched<T>> {
  const init: RequestInit = { method: query.method, headers: query.headers }
  if (signal) init.signal = signal
  if (revalidateSeconds !== undefined) init.next = { revalidate: revalidateSeconds }
  if (query.body !== undefined) init.body = JSON.stringify(query.body)
  const data = await fetchJson(via ?? query.url, init, schema)
  return { data, query }
}
