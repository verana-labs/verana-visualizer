import { resolveNetworkConfig } from '../../src/lib/env'

export const ECS_DID = 'did:webvh:QmVEcKodsZWNhMx6UT7Sq4V8JBrcvohdJTutG6q88WQPhQ:ecs-ecosystem.testnet.verana.network'
export const PAPAPO_DID = 'did:webvh:QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv:verana.papapo.shoes'
export const UNKNOWN_DID = 'did:web:not-in-the-network.example.org'

export const configFor = (network: string) =>
  resolveNetworkConfig({
    NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: `https://idx.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_RPC_ENDPOINT: `https://rpc.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_REST_ENDPOINT: `https://api.${network}.verana.network`,
    NEXT_PUBLIC_VERANA_CHAIN_ID: `vna-${network}-1`,
  })

export const testnetCfg = configFor('testnet')
