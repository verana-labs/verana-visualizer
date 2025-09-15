import { TrustRegistry, CredentialSchema, ApiResponse } from '@/types'

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://api.verana.network'

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

export function convertUvnaToVna(uvna: string): string {
  // Convert from uvna (micro units) to VNA
  const uvnaNumber = parseInt(uvna, 10)
  const vna = uvnaNumber / 1000000 // 1 VNA = 1,000,000 uvna
  return vna.toFixed(6)
}

export function formatSnakeCaseToTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
