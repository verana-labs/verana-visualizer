import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'

const LIST_KEYS: Record<string, string> = {
  ecosystems: 'ecosystems',
  schemas: 'schemas',
  participants: 'participants',
  corporations: 'corporations',
  events: 'events',
  'exchange-rates': 'exchange_rates',
  'group-members': 'group',
  'group-proposals': 'proposals',
  'group-votes': 'votes',
  'trust-deposit': 'trust_deposit',
}

export const rawBody = (name: string, network = 'testnet'): unknown =>
  (
    JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures', network, 'raw', `${name}.json`), 'utf8')) as {
      body: unknown
    }
  ).body

export function recorded<T>(name: string, network = 'testnet'): T {
  const body = rawBody(name, network)
  const key = LIST_KEYS[name]
  return (key ? (body as Record<string, unknown>)[key] : body) as T
}

export const recordedNetwork = (network = 'testnet'): RawNetwork => ({
  ecosystems: recorded('ecosystems', network),
  schemas: recorded('schemas', network),
  participants: recorded('participants', network),
  corporations: recorded('corporations', network),
  dids: recorded<{ dids: string[] }>('dids', network).dids,
})

export const testnetModel = () => buildNetworkModel(recordedNetwork())
