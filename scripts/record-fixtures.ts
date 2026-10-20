import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createChainClient } from '../src/lib/api/chain'
import { createGraphClient } from '../src/lib/api/graph'
import { createIndexerClient } from '../src/lib/api/indexer'
import type { Fetched } from '../src/lib/api/query-info'
import { resolveNetworkConfig } from '../src/lib/env'
import { FetchError } from '../src/lib/fetch-json'
import { logger } from '../src/lib/logger'

const NETWORKS = ['testnet', 'devnet'] as const
const TRUSTED_ROOT = 'did:webvh:QmVEcKodsZWNhMx6UT7Sq4V8JBrcvohdJTutG6q88WQPhQ:ecs-ecosystem.testnet.verana.network'
const UNTRUSTED = 'did:webvh:QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv:verana.papapo.shoes'
const FIXTURE_DIR = join(process.cwd(), 'tests', 'fixtures')

interface RawResponse {
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
  rawResponses.push({ status: response.status, body })
  return response
}

function configFor(network: string) {
  return resolveNetworkConfig({
    NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: `https://idx.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_RPC_ENDPOINT: `https://rpc.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_REST_ENDPOINT: `https://api.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_CHAIN_ID: `vna-${network}-1`,
  })
}

async function recordNetwork(network: string) {
  const cfg = configFor(network)
  const indexer = createIndexerClient(cfg)
  const graph = createGraphClient(cfg)
  const chain = createChainClient(cfg)
  const dir = join(FIXTURE_DIR, network)
  await mkdir(join(dir, 'raw'), { recursive: true })

  const record = async <T>(name: string, load: () => Promise<Fetched<T>>): Promise<Fetched<T>> => {
    rawResponses.length = 0
    const result = await load()
    const first = rawResponses[0]
    await writeFile(join(dir, `${name}.json`), `${JSON.stringify(result.data, null, 2)}\n`)
    const raw = { request: result.query, status: first.status, body: first.body }
    await writeFile(join(dir, 'raw', `${name}.json`), `${JSON.stringify(raw, null, 2)}\n`)
    logger.log(`${network}/${name}.json`)
    return result
  }

  const recordIfFound = async <T>(name: string, load: () => Promise<Fetched<T>>) => {
    try {
      await record(name, load)
    } catch (error) {
      if (!(error instanceof FetchError) || error.status !== 404) throw error
      logger.log(`${network}/${name}.json skipped: ${error.message}`)
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

  await recordIfFound('resolve-trusted-root', () => indexer.resolve(TRUSTED_ROOT))
  await recordIfFound('resolve-untrusted', () => indexer.resolve(UNTRUSTED))
  const firstDid = dids.data.dids[0]
  if (firstDid) await record('resolve-first-did', () => indexer.resolve(firstDid))

  const block = await record('block-height', () => indexer.blockHeight())
  await record('events', () => indexer.events(0, 100))
  await record('changes', () => indexer.changes(Math.max(1, block.data.height - 1)))
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
