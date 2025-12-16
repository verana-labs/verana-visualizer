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

export interface AbciInfoResponse {
  jsonrpc: string
  id: number
  result: {
    response: {
      data: string
      version: string
      last_block_height: string
      last_block_app_hash: string
    }
  }
}

export interface BlockResponse {
  jsonrpc: string
  id: number
  result: {
    block_id: {
      hash: string
      parts: {
        total: number
        hash: string
      }
    }
    block: {
      header: {
        version: {
          block: string
        }
        chain_id: string
        height: string
        time: string
        last_block_id: {
          hash: string
          parts: {
            total: number
            hash: string
          }
        }
        last_commit_hash: string
        data_hash: string
        validators_hash: string
        next_validators_hash: string
        consensus_hash: string
        app_hash: string
        last_results_hash: string
        evidence_hash: string
        proposer_address: string
      }
      data: {
        txs: any[]
      }
      evidence: {
        evidence: any[]
      }
      last_commit: {
        height: string
        round: number
        block_id: {
          hash: string
          parts: {
            total: number
            hash: string
          }
        }
        signatures: Array<{
          block_id_flag: number
          validator_address: string
          timestamp: string
          signature: string
        }>
      }
    }
  }
}

export interface GenesisResponse {
  jsonrpc: string
  id: number
  result: {
    genesis: {
      genesis_time: string
      chain_id: string
      initial_height: string
      app_state: {
        bank: {
          supply: Array<{
            denom: string
            amount: string
          }>
        }
        mint: {
          minter: {
            inflation: string
            annual_provisions: string
          }
          params: {
            mint_denom: string
            inflation_rate_change: string
            inflation_max: string
            inflation_min: string
            goal_bonded: string
            blocks_per_year: string
          }
        }
      }
    }
  }
}

export interface DID {
  did: string
  controller: string
  created: string
  modified: string
  exp: string
  deposit: string
}

export interface DIDListResponse {
  dids: DID[]
}

export interface SupplyResponse {
  supply: Array<{
    denom: string
    amount: string
  }>
  pagination: {
    next_key: string | null
    total: string
  }
}

export interface InflationResponse {
  inflation: string
}

export interface MintParamsResponse {
  params: {
    mint_denom: string
    inflation_rate_change: string
    inflation_max: string
    inflation_min: string
    goal_bonded: string
    blocks_per_year: string
  }
}

export interface StakingPoolResponse {
  pool: {
    not_bonded_tokens: string
    bonded_tokens: string
  }
}

export interface CommunityPoolResponse {
  pool: Array<{
    denom: string
    amount: string
  }>
}

export interface Validator {
  operator_address: string
  consensus_pubkey: {
    "@type": string
    key: string
  }
  jailed: boolean
  status: string
  tokens: string
  delegator_shares: string
  description: {
    moniker: string
    identity: string
    website: string
    security_contact: string
    details: string
  }
  unbonding_height: string
  unbonding_time: string
  commission: {
    commission_rates: {
      rate: string
      max_rate: string
      max_change_rate: string
    }
    update_time: string
  }
  min_self_delegation: string
  unbonding_on_hold_ref_count: string
  unbonding_ids: string[]
}

export interface ValidatorsResponse {
  validators: Validator[]
  pagination: {
    next_key: string | null
    total: string
  }
}

export interface Proposal {
  id: string
  messages: Array<{
    "@type": string
    authority: string
    plan?: {
      name: string
      time: string
      height: string
      info: string
      upgraded_client_state: any
    }
  }>
  status: string
  final_tally_result: {
    yes_count: string
    abstain_count: string
    no_count: string
    no_with_veto_count: string
  }
  submit_time: string
  deposit_end_time: string
  total_deposit: Array<{
    denom: string
    amount: string
  }>
  voting_start_time: string
  voting_end_time: string
  metadata: string
  title: string
  summary: string
  proposer: string
  expedited: boolean
  failed_reason: string
}

export interface ProposalsResponse {
  proposals: Proposal[]
  pagination: {
    next_key: string | null
    total: string
  }
}

export interface DenomsMetadataResponse {
  metadatas: any[]
  pagination: {
    next_key: string | null
    total: string
  }
}

export interface HeaderResponse {
  jsonrpc: string
  id: number
  result: {
    header: {
      version: {
        block: string
      }
      chain_id: string
      height: string
      time: string
      last_block_id: {
        hash: string
        parts: {
          total: number
          hash: string
        }
      }
      last_commit_hash: string
      data_hash: string
      validators_hash: string
      next_validators_hash: string
      consensus_hash: string
      app_hash: string
      last_results_hash: string
      evidence_hash: string
      proposer_address: string
    }
  }
}

// GitHub API Types
export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  forks_count: number
  fork: boolean
  language: string | null
  updated_at: string
  created_at: string
  pushed_at: string
  open_issues_count: number
  watchers_count: number
  default_branch: string
  owner: {
    login: string
    avatar_url: string
    html_url: string
  }
}

export interface GitHubContributor {
  login: string
  id: number
  avatar_url: string
  html_url: string
  contributions: number
  type: string
}

export interface GitHubCommit {
  sha: string
  commit: {
    author: {
      name: string
      email: string
      date: string
    }
    message: string
  }
  author: {
    login: string
    avatar_url: string
    html_url: string
  } | null
}

export interface CommitActivity {
  week: number
  total: number
  days: number[]
}

export interface RepositoryStats {
  name: string
  description: string | null
  url: string
  stars: number
  forks: number
  language: string | null
  totalCommits: number
  commitsThisWeek: number
  commitsThisMonth: number
  lastUpdated: string
  contributors: GitHubContributor[]
  commitActivity: CommitActivity[]
}

export interface AggregatedContributor {
  login: string
  avatar_url: string
  html_url: string
  totalContributions: number
  repositories: string[]
}

export interface GitHubApiError {
  message: string
  documentation_url?: string
}

// ============================================
// Governance Proposal Types
// ============================================

/**
 * Upgrade plan details from MsgSoftwareUpgrade
 */
export interface UpgradePlan {
  name: string
  height: string
  time: string
  info: string
  upgraded_client_state: any
}

/**
 * Parsed binary info from plan.info JSON
 */
export interface UpgradeBinaries {
  'linux/amd64'?: string
  'linux/arm64'?: string
  'darwin/amd64'?: string
  'darwin/arm64'?: string
  [key: string]: string | undefined
}

/**
 * Parsed plan info structure
 */
export interface ParsedPlanInfo {
  binaries?: UpgradeBinaries
  version?: string
  binary?: string
  [key: string]: any
}

/**
 * Execution status for upgrade proposals
 */
export type UpgradeExecutionStatus = 
  | 'executed'
  | 'not_executed'
  | 'pending'
  | 'unknown'

/**
 * Upgrade execution info with derived data
 */
export interface UpgradeExecutionInfo {
  status: UpgradeExecutionStatus
  executedAt?: string
  message: string
  planHeight: string
  currentHeight?: string
}

/**
 * Voting summary with BigInt-safe calculations
 * Note: All vote counts are stored as strings to preserve precision
 */
export interface VotingSummary {
  yesCount: string
  noCount: string
  abstainCount: string
  noWithVetoCount: string
  totalVotingPower: string
  bondedTokens: string
  turnoutPercent: string
}

/**
 * Complete upgrade proposal data structure
 * Combines proposal data with derived metrics
 */
export interface UpgradeProposalData {
  proposal: Proposal
  isUpgradeProposal: boolean
  plan?: UpgradePlan
  authority?: string
  messageType?: string
  parsedPlanInfo?: ParsedPlanInfo
  execution: UpgradeExecutionInfo
  voting: VotingSummary
}

/**
 * Response for a single proposal query
 */
export interface ProposalResponse {
  proposal: Proposal
}

/**
 * Block at height response for execution time lookup
 */
export interface BlockAtHeightResponse {
  jsonrpc: string
  id: number
  result: {
    block_id: {
      hash: string
      parts: {
        total: number
        hash: string
      }
    }
    block: {
      header: {
        version: {
          block: string
        }
        chain_id: string
        height: string
        time: string
        last_block_id: {
          hash: string
          parts: {
            total: number
            hash: string
          }
        }
        last_commit_hash: string
        data_hash: string
        validators_hash: string
        next_validators_hash: string
        consensus_hash: string
        app_hash: string
        last_results_hash: string
        evidence_hash: string
        proposer_address: string
      }
      data: {
        txs: any[]
      }
      evidence: {
        evidence: any[]
      }
      last_commit: any
    }
  }
}