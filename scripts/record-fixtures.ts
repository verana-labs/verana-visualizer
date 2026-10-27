import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createChainClient } from '../src/lib/api/chain'
import { createGraphClient } from '../src/lib/api/graph'
import { createIndexerClient } from '../src/lib/api/indexer'
import type { Fetched, QueryInfo } from '../src/lib/api/query-info'
import { FetchError } from '../src/lib/fetch-json'
import { logger } from '../src/lib/logger'
import { configFor, ECS_DID, PAPAPO_DID } from '../tests/support/network'

const NETWORKS = ['testnet', 'devnet'] as const
const TRACED_PARTICIPANTS: Record<string, number[]> = { testnet: [11, 97] }
const FIXTURE_DIR = join(process.cwd(), 'tests', 'fixtures')
const PALETTE_QUERY = 'papapo'

interface RawResponse {
  request: QueryInfo
  status: number
  body: unknown
}

const rawResponses: RawResponse[] = []
const realFetch = globalThis.fetch

globalThis.fetch = async (input, init) => {
  const response = await realFetch(input, init)
  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null)
  const request: QueryInfo = {
    method: init?.method === 'POST' ? 'POST' : 'GET',
    url: String(input),
    headers: (init?.headers ?? {}) as Record<string, string>,
    ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
  }
  rawResponses.push({ request, status: response.status, body })
  return response
}

async function recordNetwork(network: string) {
  const cfg = configFor(network)
  const indexer = createIndexerClient(cfg)
  const graph = createGraphClient(cfg)
  const chain = createChainClient(cfg)
  const dir = join(FIXTURE_DIR, network)
  await mkdir(join(dir, 'raw'), { recursive: true })

  const write = async (name: string, request: QueryInfo) => {
    if (rawResponses.length > 1) throw new Error(`${network}/${name} took ${rawResponses.length} requests`)
    const [{ status, body }] = rawResponses
    await writeFile(join(dir, 'raw', `${name}.json`), `${JSON.stringify({ request, status, body }, null, 2)}\n`)
    logger.log(`${network}/raw/${name}.json`)
  }

  const record = async <T>(name: string, load: () => Promise<Fetched<T>>): Promise<Fetched<T>> => {
    rawResponses.length = 0
    const result = await load()
    await write(name, result.query)
    return result
  }

  const recordAnyStatus = async (name: string, load: () => Promise<unknown>) => {
    rawResponses.length = 0
    await load().catch((error: unknown) => {
      if (!(error instanceof FetchError) || error.status === null) throw error
    })
    await write(name, rawResponses[0].request)
  }

  const recordIfFound = async <T>(name: string, load: () => Promise<Fetched<T>>) => {
    try {
      await record(name, load)
    } catch (error) {
      if (!(error instanceof FetchError) || error.status !== 404) throw error
      logger.log(`${network}/raw/${name}.json skipped: ${error.message}`)
    }
  }

  const [ecosystems, schemas, participants, corporations] = [
    await record('ecosystems', () => indexer.ecosystems()),
    await record('schemas', () => indexer.schemas()),
    await record('participants', () => indexer.participants()),
    await record('corporations', () => indexer.corporations()),
  ]

  const funded = corporations.data.find((c) => Number(c.deposit) > 0) ?? corporations.data[0]
  const issuer = participants.data.find((p) => p.role === 'ISSUER') ?? participants.data[0]
  const ecosystem = ecosystems.data[0]
  const schema = schemas.data[0]

  const dids = await record('dids', () => indexer.dids())
  if (funded) {
    await recordIfFound('trust-deposit', () => indexer.trustDeposit(funded.id))
    await recordIfFound('trust-deposit-history', () => indexer.trustDepositHistory(funded.id))
    await record('group-members', () => indexer.groupMembers(funded.id))
    await record('pending-flat', () => indexer.pendingFlat(funded.id))
    await record('entity-history-corporation', () => indexer.entityHistory('corporation', funded.id))
  }
  if (ecosystem) await record('entity-history-ecosystem', () => indexer.entityHistory('ecosystem', ecosystem.id))
  const firstEcosystem = [...ecosystems.data].sort((a, b) => Date.parse(a.created) - Date.parse(b.created))[0]
  if (firstEcosystem)
    await record('entity-history-first-ecosystem', () => indexer.entityHistory('ecosystem', firstEcosystem.id))
  if (schema)
    await record('entity-history-credential-schema', () => indexer.entityHistory('credential-schema', schema.id))
  if (issuer) {
    await record('entity-history-participant', () => indexer.entityHistory('participant', issuer.id))
    await record('graph-traverse-g1', () => graph.traverse('G1', { participantId: issuer.id }))
  }
  for (const participantId of TRACED_PARTICIPANTS[network] ?? [])
    await recordAnyStatus(`graph-traverse-g1-${participantId}`, () => graph.traverse('G1', { participantId }))

  await recordIfFound('resolve-trusted-root', () => indexer.resolve(ECS_DID))
  await recordIfFound('resolve-untrusted', () => indexer.resolve(PAPAPO_DID))
  const firstDid = dids.data.dids[0]
  if (firstDid) await record('resolve-first-did', () => indexer.resolve(firstDid))

  const block = await record('block-height', () => indexer.blockHeight())
  const events = await record('events', () => indexer.events(0, 100))
  const lastEvent = events.data.at(-1)
  if (network === 'testnet' && lastEvent)
    await record('events-page-2', () => indexer.events(lastEvent.block_height - 1, 100))
  await record('changes', () => indexer.changes(Math.max(1, block.data.height - 1)))
  await record('changes-38000', () => indexer.changes(38000))
  await record('stats', () =>
    indexer.stats({
      entity_type: 'GLOBAL',
      granularity: 'DAY',
      timestamp_from: '2026-10-01T00:00:00Z',
      timestamp_until: '2026-12-31T00:00:00Z',
    })
  )
  await record('snapshot', () => indexer.snapshot())

  const proposals = await record('group-proposals', () => indexer.groupProposals())
  const firstProposal = proposals.data[0]
  if (firstProposal) await record('group-votes', () => indexer.groupVotes(firstProposal.id))
  await record('exchange-rates', () => indexer.exchangeRates())
  await record('td-params', () => indexer.tdParams())
  await record('indexer-health', () => indexer.health())

  await record('graph-search', () => graph.search({ surface: 'Did', limit: 20 }))
  if (network === 'testnet')
    for (const surface of ['Did', 'Ecosystem', 'Corporation', 'CredentialSchema'] as const)
      await record(`graph-search-${PALETTE_QUERY}-${surface}`, () =>
        graph.search({
          surface,
          freeText: PALETTE_QUERY,
          limit: 20,
          ...(surface === 'Did' ? { includeUntrusted: true } : {}),
        })
      )
  await record('graph-health', () => graph.health())

  await record('chain-supply', () => chain.supply())
  await record('chain-inflation', () => chain.inflation())
  await record('chain-staking-pool', () => chain.stakingPool())
  await record('chain-community-pool', () => chain.communityPool())
  await record('chain-validators', () => chain.validators())
  await record('chain-gov-proposals', () => chain.govProposals())
  await record('chain-latest-block', () => chain.latestBlock())
  await record('chain-block', () => chain.block(100))
  await record('chain-status', () => chain.status())
}

async function main() {
  for (const network of NETWORKS) await recordNetwork(network)
}

main().catch((error: unknown) => {
  logger.error(error)
  process.exit(1)
})
