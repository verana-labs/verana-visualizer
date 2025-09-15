export interface TrustRegistry {
  id: string
  did: string
  controller: string
  created: string
  modified: string
  archived: string | null
  deposit: string
  aka: string
  active_version: number
  language: string
  versions: TrustRegistryVersion[]
}

export interface TrustRegistryListResponse {
  trust_registries: TrustRegistry[]
}

export interface TrustRegistryVersion {
  id: string
  tr_id: string
  created: string
  version: number
  active_since: string
  documents: TrustRegistryDocument[]
}

export interface TrustRegistryDocument {
  id: string
  gfv_id: string
  created: string
  language: string
  url: string
  digest_sri: string
}

export interface CredentialSchema {
  id: string
  tr_id: string
  created: string
  modified: string
  archived: string | null
  deposit: string
  json_schema: string
  issuer_grantor_validation_validity_period: number
  verifier_grantor_validation_validity_period: number
  issuer_validation_validity_period: number
  verifier_validation_validity_period: number
  holder_validation_validity_period: number
  issuer_perm_management_mode: string
  verifier_perm_management_mode: string
}

export interface ApiResponse<T> {
  [key: string]: T
}

export interface NetworkStats {
  totalSupply: string
  inflationRate: string
  trustDepositSize: string
  blockHeight: string
}
