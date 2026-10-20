import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createChainClient } from '../src/lib/api/chain'
import { createGraphClient } from '../src/lib/api/graph'
import { createIndexerClient } from '../src/lib/api/indexer'
import { resolveNetworkConfig } from '../src/lib/env'
import { FetchError } from '../src/lib/fetch-json'
import { logger } from '../src/lib/logger'

const NETWORKS = ['testnet', 'devnet'] as const
const TRUSTED_ROOT = 'did:webvh:QmVEcKodsZWNhMx6UT7Sq4V8JBrcvohdJTutG6q88WQPhQ:ecs-ecosystem.testnet.verana.network'
const UNTRUSTED = 'did:webvh:QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv:verana.papapo.shoes'
const FIXTURE_DIR = join(process.cwd(), 'tests', 'fixtures')

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
  await mkdir(dir, { recursive: true })

  const save = async (name: string, data: unknown) => {
    await writeFile(join(dir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
    logger.log(`${network}/${name}.json`)
  }

  const saveIfFound = async (name: string, load: () => Promise<{ data: unknown }>) => {
    try {
      await save(name, (await load()).data)
    } catch (error) {
      if (!(error instanceof FetchError) || error.status !== 404) throw error
      logger.log(`${network}/${name}.json skipped: ${error.message}`)
    }
  }

  const [ecosystems, schemas, participants, corporations] = await Promise.all([
    indexer.ecosystems(),
    indexer.schemas(),
    indexer.participants(),
    indexer.corporations(),
  ])
  await save('ecosystems', ecosystems.data)
  await save('schemas', schemas.data)
  await save('participants', participants.data)
  await save('corporations', corporations.data)

  const funded = corporations.data.find((c) => Number(c.deposit) > 0) ?? corporations.data[0]
  const issuer = participants.data.find((p) => p.role === 'ISSUER') ?? participants.data[0]
  const ecosystem = ecosystems.data[0]
  const schema = schemas.data[0]

  const dids = await indexer.dids()
  await save('dids', dids.data)
  if (funded) {
    await saveIfFound('trust-deposit', () => indexer.trustDeposit(funded.id))
    await saveIfFound('trust-deposit-history', () => indexer.trustDepositHistory(funded.id))
    await save('group-members', (await indexer.groupMembers(funded.id)).data)
    await save('pending-flat', (await indexer.pendingFlat(funded.id)).data)
    await save('entity-history-corporation', (await indexer.entityHistory('corporation', funded.id)).data)
  }
  if (ecosystem) await save('entity-history-ecosystem', (await indexer.entityHistory('ecosystem', ecosystem.id)).data)
  if (schema)
    await save('entity-history-credential-schema', (await indexer.entityHistory('credential-schema', schema.id)).data)
  if (issuer) {
    await save('entity-history-participant', (await indexer.entityHistory('participant', issuer.id)).data)
    await save('graph-traverse-g1', (await graph.traverse('G1', { participantId: issuer.id })).data)
  }

  await saveIfFound('resolve-trusted-root', () => indexer.resolve(TRUSTED_ROOT))
  await saveIfFound('resolve-untrusted', () => indexer.resolve(UNTRUSTED))
  const firstDid = dids.data.dids[0]
  if (firstDid) await save('resolve-first-did', (await indexer.resolve(firstDid)).data)

  const block = await indexer.blockHeight()
  await save('block-height', block.data)
  await save('events', (await indexer.events(0, 100)).data)
  await save('changes', (await indexer.changes(Math.max(1, block.data.height - 1))).data)
  await save(
    'stats',
    (
      await indexer.stats({
        entity_type: 'GLOBAL',
        granularity: 'DAY',
        timestamp_from: '2026-10-01T00:00:00Z',
        timestamp_until: '2026-12-31T00:00:00Z',
      })
    ).data
  )
  await save('snapshot', (await indexer.snapshot()).data)

  const proposals = await indexer.groupProposals()
  await save('group-proposals', proposals.data)
  if (proposals.data[0]) await save('group-votes', (await indexer.groupVotes(proposals.data[0].id)).data)
  await save('exchange-rates', (await indexer.exchangeRates()).data)
  await save('td-params', (await indexer.tdParams()).data)
  await save('indexer-health', (await indexer.health()).data)

  await save('graph-search', (await graph.search({ surface: 'Did', limit: 20 })).data)
  await save('graph-health', (await graph.health()).data)

  await save('chain-supply', (await chain.supply()).data)
  await save('chain-inflation', (await chain.inflation()).data)
  await save('chain-staking-pool', (await chain.stakingPool()).data)
  await save('chain-community-pool', (await chain.communityPool()).data)
  await save('chain-validators', (await chain.validators()).data)
  await save('chain-gov-proposals', (await chain.govProposals()).data)
  await save('chain-latest-block', (await chain.latestBlock()).data)
  await save('chain-block', (await chain.block(100)).data)
  await save('chain-status', (await chain.status()).data)
}

async function main() {
  for (const network of NETWORKS) await recordNetwork(network)
}

main().catch((error: unknown) => {
  logger.error(error)
  process.exit(1)
})
