import { env } from 'next-runtime-env'
import {
  AbciInfoResponse,
  ApiResponse,
  BlockAtHeightResponse,
  BlockResponse,
  CommunityPoolResponse,
  CredentialSchema,
  DenomsMetadataResponse,
  DIDListResponse,
  EcosystemMetrics,
  GenesisResponse,
  HeaderResponse,
  InflationResponse,
  MintParamsResponse,
  PermissionResponse,
  ProposalResponse,
  ProposalsResponse,
  StakingPoolResponse,
  SupplyResponse,
  TrustRegistry,
  TrustRegistryListResponse,
  ValidatorsResponse,
} from '@/types'

const getApiEndpoint = () =>
  env('NEXT_PUBLIC_API_ENDPOINT') || process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://api.testnet.verana.network'
const getRpcEndpoint = () =>
  env('NEXT_PUBLIC_RPC_ENDPOINT') || process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://rpc.testnet.verana.network'
const getIdxEndpoint = () =>
  env('NEXT_PUBLIC_IDX_ENDPOINT') || process.env.NEXT_PUBLIC_IDX_ENDPOINT || 'https://idx.testnet.verana.network'

async function fetchJSON<T>(url: string, errorContext: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to ${errorContext}: network error (${reason})`)
  }

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.text()).trim()
      if (body) detail = detail ? `${detail} — ${body.slice(0, 300)}` : body.slice(0, 300)
    } catch {}
    throw new Error(`Failed to ${errorContext}: ${response.status} ${detail}`.trim())
  }

  if (response.status === 204) {
    throw new Error(`Failed to ${errorContext}: server returned 204 No Content`)
  }

  try {
    return (await response.json()) as T
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to ${errorContext}: invalid JSON response (${reason})`)
  }
}

export async function fetchTrustRegistry(trId: string): Promise<ApiResponse<{ trust_registry: TrustRegistry }>> {
  return fetchJSON(`${getApiEndpoint()}/verana/tr/v1/get/${trId}`, 'fetch trust registry')
}

export async function fetchCredentialSchemas(trId: string): Promise<ApiResponse<{ schemas: CredentialSchema[] }>> {
  return fetchJSON(`${getApiEndpoint()}/verana/tr/v1/schemas/${trId}`, 'fetch credential schemas')
}

export async function fetchTrustRegistryList(maxSize: number = 100): Promise<TrustRegistryListResponse> {
  return fetchJSON(`${getApiEndpoint()}/verana/tr/v1/list?response_max_size=${maxSize}`, 'fetch trust registry list')
}

export function convertUvnaToVna(uvna: string): string {
  const uvnaNumber = parseInt(uvna, 10)
  const vna = uvnaNumber / 1000000

  if (vna >= 1000) {
    return vna.toFixed(0)
  } else if (vna >= 100) {
    return vna.toFixed(1)
  } else if (vna >= 10) {
    return vna.toFixed(2)
  } else {
    return vna.toFixed(2)
  }
}

export function formatSnakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function fetchAbciInfo(): Promise<AbciInfoResponse> {
  return fetchJSON(`${getRpcEndpoint()}/abci_info`, 'fetch ABCI info')
}

export async function fetchLatestBlock(): Promise<BlockResponse> {
  return fetchJSON(`${getRpcEndpoint()}/block`, 'fetch latest block')
}

export async function fetchGenesis(): Promise<GenesisResponse> {
  return fetchJSON(`${getRpcEndpoint()}/genesis`, 'fetch genesis')
}

export function formatBlockHeight(height: string): string {
  return parseInt(height).toLocaleString()
}

export function formatInflationRate(rate: string): string {
  const percentage = (parseFloat(rate) * 100).toFixed(2)
  return `${percentage}%`
}

export function formatTotalSupply(amount: string): string {
  const vna = convertUvnaToVna(amount)
  return `${parseFloat(vna).toLocaleString()} VNA`
}

export async function fetchDIDList(): Promise<DIDListResponse> {
  return fetchJSON(`${getApiEndpoint()}/verana/dd/v1/list`, 'fetch DID list')
}

export async function fetchPermission(permissionId: string): Promise<PermissionResponse> {
  return fetchJSON(`${getIdxEndpoint()}/verana/perm/v1/get/${permissionId}`, `fetch permission ${permissionId}`)
}

export async function fetchSupply(): Promise<SupplyResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/bank/v1beta1/supply`, 'fetch supply')
}

export async function fetchInflation(): Promise<InflationResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/mint/v1beta1/inflation`, 'fetch inflation')
}

export async function fetchMintParams(): Promise<MintParamsResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/mint/v1beta1/params`, 'fetch mint params')
}

export async function fetchStakingPool(): Promise<StakingPoolResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/staking/v1beta1/pool`, 'fetch staking pool')
}

export async function fetchCommunityPool(): Promise<CommunityPoolResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/staking/v1beta1/pool`, 'fetch community pool')
}

export async function fetchValidators(): Promise<ValidatorsResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/staking/v1beta1/validators`, 'fetch validators')
}

export async function fetchProposals(): Promise<ProposalsResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/gov/v1/proposals`, 'fetch proposals')
}

export async function fetchDenomsMetadata(): Promise<DenomsMetadataResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/bank/v1beta1/denoms_metadata`, 'fetch denoms metadata')
}

export async function fetchHeader(): Promise<HeaderResponse> {
  return fetchJSON(`${getRpcEndpoint()}/header`, 'fetch header')
}

// ============================================
// Governance Proposal API Functions
// ============================================

/**
 * Fetch a single proposal by ID
 */
export async function fetchProposal(proposalId: string): Promise<ProposalResponse> {
  return fetchJSON(`${getApiEndpoint()}/cosmos/gov/v1/proposals/${proposalId}`, `fetch proposal ${proposalId}`)
}

/**
 * Fetch block at a specific height
 * Used to get execution time for upgrade proposals
 */
export async function fetchBlockAtHeight(height: string | number): Promise<BlockAtHeightResponse> {
  return fetchJSON(`${getRpcEndpoint()}/block?height=${height}`, `fetch block at height ${height}`)
}

/**
 * Get current chain height from RPC status
 */
export async function fetchCurrentHeight(): Promise<string> {
  const data = await fetchJSON<{ result?: { sync_info?: { latest_block_height?: string } } }>(
    `${getRpcEndpoint()}/status`,
    'fetch chain status'
  )
  return data.result?.sync_info?.latest_block_height || '0'
}

// ============================================
// Ecosystem Metrics API Functions
// ============================================

export async function fetchEcosystemMetrics(atBlockHeight?: number): Promise<EcosystemMetrics> {
  const params = atBlockHeight ? `?height=${atBlockHeight}` : ''
  return fetchJSON(`/api/ecosystem/metrics${params}`, 'fetch ecosystem metrics')
}
