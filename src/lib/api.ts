import { 
  TrustRegistry, 
  CredentialSchema, 
  ApiResponse, 
  TrustRegistryListResponse, 
  AbciInfoResponse, 
  BlockResponse, 
  GenesisResponse, 
  DID, 
  DIDListResponse,
  SupplyResponse,
  InflationResponse,
  MintParamsResponse,
  StakingPoolResponse,
  CommunityPoolResponse,
  ValidatorsResponse,
  ProposalsResponse,
  DenomsMetadataResponse,
  HeaderResponse
} from '@/types'

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://api.testnet.verana.network'
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://rpc.testnet.verana.network'

export async function fetchTrustRegistry(trId: string): Promise<ApiResponse<{ trust_registry: TrustRegistry }>> {
  const response = await fetch(`${API_ENDPOINT}/verana/tr/v1/get/${trId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trust registry: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchCredentialSchemas(trId: string): Promise<ApiResponse<{ schemas: CredentialSchema[] }>> {
  const response = await fetch(`${API_ENDPOINT}/verana/tr/v1/schemas/${trId}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch credential schemas: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchTrustRegistryList(maxSize: number = 100): Promise<TrustRegistryListResponse> {
  const response = await fetch(`${API_ENDPOINT}/verana/tr/v1/list?response_max_size=${maxSize}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch trust registry list: ${response.statusText}`)
  }
  
  return response.json()
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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export async function fetchAbciInfo(): Promise<AbciInfoResponse> {
  const response = await fetch(`${RPC_ENDPOINT}/abci_info`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ABCI info: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchLatestBlock(): Promise<BlockResponse> {
  const response = await fetch(`${RPC_ENDPOINT}/block`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch latest block: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchGenesis(): Promise<GenesisResponse> {
  const response = await fetch(`${RPC_ENDPOINT}/genesis`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch genesis: ${response.statusText}`)
  }
  
  return response.json()
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
  const response = await fetch(`${API_ENDPOINT}/verana/dd/v1/list`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch DID list: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchSupply(): Promise<SupplyResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/bank/v1beta1/supply`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch supply: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchInflation(): Promise<InflationResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/mint/v1beta1/inflation`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch inflation: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchMintParams(): Promise<MintParamsResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/mint/v1beta1/params`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch mint params: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchStakingPool(): Promise<StakingPoolResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/staking/v1beta1/pool`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch staking pool: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchCommunityPool(): Promise<CommunityPoolResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/distribution/v1beta1/community_pool`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch community pool: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchValidators(): Promise<ValidatorsResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/staking/v1beta1/validators`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch validators: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchProposals(): Promise<ProposalsResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/gov/v1/proposals`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch proposals: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchDenomsMetadata(): Promise<DenomsMetadataResponse> {
  const response = await fetch(`${API_ENDPOINT}/cosmos/bank/v1beta1/denoms_metadata`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch denoms metadata: ${response.statusText}`)
  }
  
  return response.json()
}

export async function fetchHeader(): Promise<HeaderResponse> {
  const response = await fetch(`${RPC_ENDPOINT}/header`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch header: ${response.statusText}`)
  }
  
  return response.json()
}
