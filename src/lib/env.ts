import { env } from 'next-runtime-env'
import { useMemo } from 'react'

export type NetworkName = 'devnet' | 'testnet' | string

export interface NetworkConfig {
  indexerUrl: string
  graphUrl: string
  restUrl: string
  rpcUrl: string
  frontendUrl: string
  peerVisualizerUrl: string | null
  chainId: string
  chainName: NetworkName
  indexerWsUrl: string
}

type EnvSource = Record<string, string | undefined>

const INDEXER_HOST = /^(https?:\/\/)idx\.([a-z0-9-]+)\.verana\.network$/
const PEERS: Record<string, string> = { devnet: 'testnet', testnet: 'devnet' }

const VARIABLES = {
  indexer: ['NEXT_PUBLIC_VERANA_INDEXER_BASE_URL', 'NEXT_PUBLIC_IDX_ENDPOINT'],
  rpc: ['NEXT_PUBLIC_VERANA_RPC_ENDPOINT', 'NEXT_PUBLIC_RPC_ENDPOINT'],
  rest: ['NEXT_PUBLIC_VERANA_REST_ENDPOINT', 'NEXT_PUBLIC_API_ENDPOINT'],
  chainId: ['NEXT_PUBLIC_VERANA_CHAIN_ID', 'NEXT_PUBLIC_CHAIN_ID'],
  chainName: ['NEXT_PUBLIC_VERANA_CHAIN_NAME', 'NEXT_PUBLIC_CHAIN_NAME'],
} as const

const OPTIONAL_VARIABLES = [
  'NEXT_PUBLIC_VERANA_GRAPH_URL',
  'NEXT_PUBLIC_VERANA_FRONTEND_URL',
  'NEXT_PUBLIC_VERANA_PEER_VISUALIZER_URL',
] as const

export const NETWORK_ENV_NAMES: readonly string[] = [...Object.values(VARIABLES).flat(), ...OPTIONAL_VARIABLES]

function read(source: EnvSource, name: string): string | undefined {
  const value = source[name]?.trim()
  return value ? value : undefined
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function normalizeIndexerUrl(url: string): string {
  return normalizeUrl(normalizeUrl(url).replace(/\/v4$/, ''))
}

function requireVariable(source: EnvSource, [primary, legacy]: readonly [string, string]): string {
  const value = read(source, primary) ?? read(source, legacy)
  if (!value) throw new Error(`${primary} (or legacy ${legacy}) is required`)
  return value
}

function toWebSocketUrl(indexerUrl: string): string {
  return `${indexerUrl.replace(/^http/, 'ws')}/v4/indexer/subscribe`
}

export function resolveNetworkConfig(source: EnvSource): NetworkConfig {
  const indexerUrl = normalizeIndexerUrl(requireVariable(source, VARIABLES.indexer))
  const restUrl = normalizeUrl(requireVariable(source, VARIABLES.rest))
  const rpcUrl = normalizeUrl(requireVariable(source, VARIABLES.rpc))

  const derivedNetwork = INDEXER_HOST.exec(indexerUrl)
  const scheme = derivedNetwork?.[1]
  const network = derivedNetwork?.[2]

  const chainId = requireVariable(source, VARIABLES.chainId)
  const chainName = read(source, VARIABLES.chainName[0]) ?? read(source, VARIABLES.chainName[1]) ?? network
  if (!chainName) {
    throw new Error(`${VARIABLES.chainName[0]} (or legacy ${VARIABLES.chainName[1]}) is required`)
  }

  const explicitGraph = read(source, 'NEXT_PUBLIC_VERANA_GRAPH_URL')
  const explicitFrontend = read(source, 'NEXT_PUBLIC_VERANA_FRONTEND_URL')
  const explicitPeer = read(source, 'NEXT_PUBLIC_VERANA_PEER_VISUALIZER_URL')

  const peerNetwork = network ? PEERS[network] : undefined
  const derivedPeer = scheme && peerNetwork ? `${scheme}vis.${peerNetwork}.verana.network` : null

  return {
    indexerUrl,
    graphUrl: explicitGraph
      ? normalizeUrl(explicitGraph)
      : derive(scheme, 'graph', network, indexerUrl, 'NEXT_PUBLIC_VERANA_GRAPH_URL'),
    restUrl,
    rpcUrl,
    frontendUrl: explicitFrontend
      ? normalizeUrl(explicitFrontend)
      : derive(scheme, 'app', network, indexerUrl, 'NEXT_PUBLIC_VERANA_FRONTEND_URL'),
    peerVisualizerUrl: explicitPeer ? normalizeUrl(explicitPeer) : derivedPeer,
    chainId,
    chainName,
    indexerWsUrl: toWebSocketUrl(indexerUrl),
  }
}

function derive(
  scheme: string | undefined,
  subdomain: string,
  network: string | undefined,
  indexerUrl: string,
  variable: string
): string {
  if (!scheme || !network) {
    throw new Error(`${variable} is required when the indexer is not idx.<net>.verana.network (got ${indexerUrl})`)
  }
  return `${scheme}${subdomain}.${network}.verana.network`
}

export function useNetworkConfig(): NetworkConfig {
  return useMemo(() => {
    const source: EnvSource = {}
    for (const name of NETWORK_ENV_NAMES) source[name] = env(name)
    return resolveNetworkConfig(source)
  }, [])
}
