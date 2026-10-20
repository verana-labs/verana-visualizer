import { describe, expect, it } from 'vitest'
import { resolveNetworkConfig } from './env'

const legacyTestnet = {
  NEXT_PUBLIC_IDX_ENDPOINT: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_API_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_CHAIN_ID: 'vna-testnet-1',
  NEXT_PUBLIC_CHAIN_NAME: 'testnet',
}

describe('resolveNetworkConfig', () => {
  it('derives graph, frontend, peer and ws from a legacy testnet indexer', () => {
    expect(resolveNetworkConfig(legacyTestnet)).toEqual({
      indexerUrl: 'https://idx.testnet.verana.network',
      graphUrl: 'https://graph.testnet.verana.network',
      restUrl: 'https://api.testnet.verana.network',
      rpcUrl: 'https://rpc.testnet.verana.network',
      frontendUrl: 'https://app.testnet.verana.network',
      peerVisualizerUrl: 'https://vis.devnet.verana.network',
      chainId: 'vna-testnet-1',
      chainName: 'testnet',
      indexerWsUrl: 'wss://idx.testnet.verana.network/v4/indexer/subscribe',
    })
  })

  it('prefers NEXT_PUBLIC_VERANA_* over legacy names', () => {
    const c = resolveNetworkConfig({
      ...legacyTestnet,
      NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://x.example',
      NEXT_PUBLIC_VERANA_GRAPH_URL: 'https://graph.x.example',
      NEXT_PUBLIC_VERANA_FRONTEND_URL: 'https://app.x.example',
      NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://rest.example',
      NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.example',
      NEXT_PUBLIC_VERANA_CHAIN_ID: 'chain-x',
      NEXT_PUBLIC_VERANA_CHAIN_NAME: 'xnet',
    })
    expect(c.indexerUrl).toBe('https://x.example')
    expect(c.restUrl).toBe('https://rest.example')
    expect(c.rpcUrl).toBe('https://rpc.example')
    expect(c.chainId).toBe('chain-x')
    expect(c.chainName).toBe('xnet')
  })

  it('strips a trailing slash and a trailing /v4', () => {
    const c = resolveNetworkConfig({
      ...legacyTestnet,
      NEXT_PUBLIC_IDX_ENDPOINT: 'https://idx.devnet.verana.network/v4/',
      NEXT_PUBLIC_API_ENDPOINT: 'https://api.devnet.verana.network/',
    })
    expect(c.indexerUrl).toBe('https://idx.devnet.verana.network')
    expect(c.restUrl).toBe('https://api.devnet.verana.network')
    expect(c.peerVisualizerUrl).toBe('https://vis.testnet.verana.network')
  })

  it('returns peerVisualizerUrl null for a non verana.network host', () => {
    const c = resolveNetworkConfig({
      ...legacyTestnet,
      NEXT_PUBLIC_IDX_ENDPOINT: 'http://localhost:3001',
      NEXT_PUBLIC_VERANA_GRAPH_URL: 'http://localhost:3002',
      NEXT_PUBLIC_VERANA_FRONTEND_URL: 'http://localhost:3003',
    })
    expect(c.peerVisualizerUrl).toBeNull()
    expect(c.indexerWsUrl).toBe('ws://localhost:3001/v4/indexer/subscribe')
  })

  it('throws naming the graph and frontend variables when a custom indexer host cannot derive them', () => {
    const custom = { ...legacyTestnet, NEXT_PUBLIC_IDX_ENDPOINT: 'http://localhost:3001' }
    expect(() => resolveNetworkConfig(custom)).toThrow(
      'NEXT_PUBLIC_VERANA_GRAPH_URL is required when the indexer is not idx.<net>.verana.network (got http://localhost:3001)'
    )
    expect(() => resolveNetworkConfig({ ...custom, NEXT_PUBLIC_VERANA_GRAPH_URL: 'http://localhost:3002' })).toThrow(
      'NEXT_PUBLIC_VERANA_FRONTEND_URL is required when the indexer is not idx.<net>.verana.network (got http://localhost:3001)'
    )
  })

  it('lets explicit graph, frontend and peer urls win over derivation', () => {
    const c = resolveNetworkConfig({
      ...legacyTestnet,
      NEXT_PUBLIC_VERANA_GRAPH_URL: 'https://graph.example/',
      NEXT_PUBLIC_VERANA_FRONTEND_URL: 'https://app.example/',
      NEXT_PUBLIC_VERANA_PEER_VISUALIZER_URL: 'https://peer.example/',
    })
    expect(c.graphUrl).toBe('https://graph.example')
    expect(c.frontendUrl).toBe('https://app.example')
    expect(c.peerVisualizerUrl).toBe('https://peer.example')
  })

  it('derives the chain name from the indexer host when missing', () => {
    const { NEXT_PUBLIC_CHAIN_NAME: _name, ...rest } = legacyTestnet
    expect(resolveNetworkConfig(rest).chainName).toBe('testnet')
  })

  it('throws naming the missing variable when no indexer url resolves', () => {
    expect(() => resolveNetworkConfig({})).toThrow(
      'NEXT_PUBLIC_VERANA_INDEXER_BASE_URL (or legacy NEXT_PUBLIC_IDX_ENDPOINT) is required'
    )
  })

  it('throws when the rpc endpoint is missing', () => {
    const { NEXT_PUBLIC_RPC_ENDPOINT: _rpc, ...rest } = legacyTestnet
    expect(() => resolveNetworkConfig(rest)).toThrow(
      'NEXT_PUBLIC_VERANA_RPC_ENDPOINT (or legacy NEXT_PUBLIC_RPC_ENDPOINT) is required'
    )
  })

  it('throws when the rest endpoint is missing', () => {
    const { NEXT_PUBLIC_API_ENDPOINT: _api, ...rest } = legacyTestnet
    expect(() => resolveNetworkConfig(rest)).toThrow(
      'NEXT_PUBLIC_VERANA_REST_ENDPOINT (or legacy NEXT_PUBLIC_API_ENDPOINT) is required'
    )
  })

  it('throws when the chain id is missing', () => {
    const { NEXT_PUBLIC_CHAIN_ID: _id, ...rest } = legacyTestnet
    expect(() => resolveNetworkConfig(rest)).toThrow(
      'NEXT_PUBLIC_VERANA_CHAIN_ID (or legacy NEXT_PUBLIC_CHAIN_ID) is required'
    )
  })
})
