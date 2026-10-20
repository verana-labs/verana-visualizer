import { z } from 'zod'

const amount = z.union([z.number(), z.string()])
const optionalText = z.string().nullish()

export const ecosystemDocumentSchema = z
  .object({ id: z.number(), language: z.string(), url: z.string(), digest_sri: optionalText })
  .passthrough()

export const ecosystemVersionSchema = z
  .object({
    id: z.number(),
    version: z.number(),
    active_since: optionalText,
    documents: z.array(ecosystemDocumentSchema),
  })
  .passthrough()

export const ecosystemSchema = z
  .object({
    id: z.number(),
    did: z.string(),
    corporation_id: z.number(),
    created: z.string(),
    modified: z.string(),
    archived: optionalText,
    language: z.string(),
    active_version: z.number(),
    versions: z.array(ecosystemVersionSchema),
    active_schemas: z.number(),
    archived_schemas: z.number(),
    participants: z.number(),
    weight: amount,
    issued: amount,
    verified: amount,
  })
  .passthrough()

export const credentialSchemaSchema = z
  .object({
    id: z.number(),
    ecosystem_id: z.number(),
    json_schema: z.string(),
    title: optionalText,
    description: optionalText,
    issuer_onboarding_mode: z.string(),
    verifier_onboarding_mode: z.string(),
    holder_onboarding_mode: z.string(),
    pricing_asset_type: optionalText,
    pricing_asset: optionalText,
    created: z.string(),
    modified: z.string(),
    archived: optionalText,
    participants: z.number(),
    weight: amount,
    issued: amount,
    verified: amount,
  })
  .passthrough()

export const participantSchema = z
  .object({
    id: z.number(),
    schema_id: z.number(),
    ecosystem_id: z.number().nullish(),
    role: z.string(),
    did: optionalText,
    corporation_id: z.number(),
    created: z.string(),
    modified: z.string(),
    slashed: optionalText,
    repaid: optionalText,
    effective_from: optionalText,
    effective_until: optionalText,
    revoked: optionalText,
    validation_fees: amount,
    issuance_fees: amount,
    verification_fees: amount,
    deposit: amount,
    slashed_deposit: amount,
    repaid_deposit: amount,
    validator_participant_id: z.number().nullable(),
    op_state: z.string(),
    participant_state: z.string(),
    vs_operator: optionalText,
    issued: amount,
    verified: amount,
    weight: amount,
  })
  .passthrough()

export const corporationSchema = z
  .object({
    id: z.number(),
    did: optionalText,
    policy_address: z.string(),
    language: optionalText,
    active_version: z.number(),
    created: z.string(),
    modified: z.string(),
    controlled_ecosystems: z.number(),
    participants: z.number(),
    deposit: amount,
    share: amount,
    refunded: amount,
    slashed_deposit: amount,
    repaid_deposit: amount,
    slash_count: z.number(),
  })
  .passthrough()

export const trustDepositSchema = z
  .object({
    corporation_id: z.number(),
    share: amount,
    deposit: amount,
    refunded: amount,
    claimable: amount,
    slashed_deposit: amount,
    repaid_deposit: amount,
    slash_count: z.number(),
    last_slashed: optionalText,
    last_repaid: optionalText,
  })
  .passthrough()

export const trustDepositResponseSchema = z.object({ trust_deposit: trustDepositSchema }).passthrough()

export const activityItemSchema = z
  .object({
    id: z.number().optional(),
    timestamp: z.string(),
    block_height: amount,
    entity_type: z.string(),
    entity_id: z.union([z.string(), z.number()]),
    msg: z.string(),
    changes: z.record(z.string(), z.unknown()),
    account: z.string().optional(),
  })
  .passthrough()

export const historyItemSchema = activityItemSchema.extend({ id: z.number() })

export const historyActivitySchema = z.array(historyItemSchema)

export const trustVerdictSchema = z
  .object({
    did: z.string(),
    trusted: z.boolean(),
    evaluatedAtTime: optionalText,
    evaluatedAtBlock: z.number().nullish(),
    expiresAtTime: optionalText,
    corporationId: z.number().nullish(),
  })
  .passthrough()

export const indexerEventSchema = z
  .object({
    type: z.string(),
    event_type: z.string(),
    did: optionalText,
    block_height: z.number(),
    tx_hash: optionalText,
    timestamp: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'timestamp is not a date'),
    payload: z.record(z.string(), z.unknown()),
  })
  .passthrough()

export const eventsResponseSchema = z.object({ events: z.array(indexerEventSchema) }).passthrough()

export const changesSchema = z
  .object({
    block_height: z.number(),
    next_change_at: z.number().nullable(),
    activity: z.array(activityItemSchema),
  })
  .passthrough()

export const statsBucketSchema = z.object({ timestamp: z.string() }).passthrough()

export const statsSchema = z
  .object({
    granularity: z.string().nullish(),
    timestamp_from: z.string(),
    timestamp_until: z.string(),
    entity_type: z.string(),
    entity_ids: z.array(z.union([z.number(), z.string()])),
    result_type: z.string(),
    buckets: z.array(statsBucketSchema).optional(),
    total: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()

export const statsSnapshotSchema = z
  .object({
    entity_type: z.string(),
    entity_id: z.number().nullable(),
    block_height: z.number(),
    timestamp: z.string(),
    participants: z.number(),
    active_ecosystems: z.number(),
    active_schemas: z.number(),
    weight: amount,
    issued: amount,
    verified: amount,
  })
  .passthrough()

export const blockHeightSchema = z.object({ type: z.string(), height: z.number(), timestamp: z.string() }).passthrough()

export const indexerStatusSchema = z.object({ is_running: z.boolean(), is_crawling: z.boolean() }).passthrough()

export const groupProposalSchema = z
  .object({
    id: z.number(),
    corporation_id: z.number(),
    group_policy_address: z.string(),
    proposers: z.array(z.string()),
    submit_time: z.string(),
    status: z.string(),
    voting_period_end: z.string(),
    executor_result: optionalText,
    messages: z.array(z.record(z.string(), z.unknown())),
  })
  .passthrough()

export const groupVoteSchema = z
  .object({
    id: z.number(),
    proposal_id: z.number(),
    voter: z.string(),
    option: z.string(),
    submit_time: z.string(),
  })
  .passthrough()

export const groupMemberSchema = z
  .object({ address: z.string(), weight: amount, metadata: optionalText, added_at: optionalText })
  .passthrough()

export const groupSchema = z
  .object({
    corporation_id: z.number(),
    group_id: z.number(),
    version: z.number(),
    total_weight: amount,
    policy: z
      .object({ address: z.string(), decision_policy: z.record(z.string(), z.unknown()) })
      .passthrough()
      .nullish(),
    members: z.array(groupMemberSchema),
  })
  .passthrough()

export const groupResponseSchema = z.object({ group: groupSchema }).passthrough()

export const exchangeRateSchema = z
  .object({
    id: z.number(),
    base_asset_type: z.string(),
    base_asset: z.string(),
    quote_asset_type: z.string(),
    quote_asset: z.string(),
    rate: amount,
    rate_scale: z.number().nullish(),
    state: z.union([z.boolean(), z.string()]).nullish(),
    updated: optionalText,
    expires: optionalText,
  })
  .passthrough()

export const trustDepositParamsSchema = z
  .object({
    params: z
      .object({ trust_deposit_rate: amount, trust_deposit_share_value: amount, trust_deposit_max_yield_rate: amount })
      .passthrough(),
  })
  .passthrough()

export const pendingParticipantSchema = z.object({ id: z.number(), role: z.string() }).passthrough()

export const pendingFlatSchema = z
  .object({
    ecosystems: z.array(
      z
        .object({
          id: z.number(),
          did: optionalText,
          pending_tasks: z.number(),
          schemas: z.array(
            z
              .object({
                id: z.number(),
                pending_tasks: z.number(),
                pending_participants: z.array(pendingParticipantSchema),
              })
              .passthrough()
          ),
        })
        .passthrough()
    ),
  })
  .passthrough()

export const verifiableTrustDidsPageSchema = z
  .object({ atBlock: z.number(), dids: z.array(z.string()), nextCursor: z.string().nullish() })
  .passthrough()

export const didListSchema = z.object({ atBlock: z.number(), dids: z.array(z.string()) }).passthrough()

export const graphHealthSchema = z.object({ status: z.string(), lastAppliedBlock: z.number() }).passthrough()

export const traverseResponseSchema = z
  .object({
    query: z.string(),
    evaluatedAtTime: z.string(),
    output: z.unknown(),
    nextCursor: z.string().nullish(),
  })
  .passthrough()

export const validatorChainNodeSchema = z
  .object({
    id: z.number(),
    didId: z.string().nullable(),
    role: z.string(),
    state: z.string(),
    credentialSchemaId: z.number().nullish(),
    ecosystemId: z.number().nullish(),
    validatorParticipantId: z.number().nullable(),
  })
  .passthrough()

export const validatorChainSchema = z.array(validatorChainNodeSchema)

export const searchResponseSchema = z
  .object({
    totalCount: z.number(),
    hits: z.array(z.object({ type: z.string(), id: z.union([z.string(), z.number()]) }).passthrough()),
    nextCursor: z.string().nullish(),
  })
  .passthrough()

const coinSchema = z.object({ denom: z.string(), amount: z.string() }).passthrough()
const chainPaginationSchema = z.object({ next_key: z.string().nullish(), total: z.string().nullish() }).passthrough()

export const supplyPageSchema = z
  .object({ supply: z.array(coinSchema), pagination: chainPaginationSchema.nullish() })
  .passthrough()
export const supplySchema = z.array(coinSchema)

export const inflationSchema = z.object({ inflation: z.string() }).passthrough()

export const stakingPoolSchema = z
  .object({ pool: z.object({ not_bonded_tokens: z.string(), bonded_tokens: z.string() }).passthrough() })
  .passthrough()

export const communityPoolSchema = z.object({ pool: z.array(coinSchema) }).passthrough()

export const validatorSchema = z
  .object({
    operator_address: z.string(),
    jailed: z.boolean(),
    status: z.string(),
    tokens: z.string(),
    delegator_shares: z.string(),
    description: z.object({ moniker: z.string() }).passthrough(),
    commission: z
      .object({ commission_rates: z.object({ rate: z.string(), max_rate: z.string() }).passthrough() })
      .passthrough(),
  })
  .passthrough()

export const validatorsPageSchema = z
  .object({ validators: z.array(validatorSchema), pagination: chainPaginationSchema.nullish() })
  .passthrough()
export const validatorsSchema = z.array(validatorSchema)

export const govProposalSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    submit_time: z.string().nullish(),
    voting_end_time: z.string().nullish(),
    title: z.string().nullish(),
    summary: z.string().nullish(),
  })
  .passthrough()

export const govProposalsPageSchema = z
  .object({ proposals: z.array(govProposalSchema), pagination: chainPaginationSchema.nullish() })
  .passthrough()
export const govProposalsSchema = z.array(govProposalSchema)

export const blockSchema = z
  .object({
    block_id: z.object({ hash: z.string() }).passthrough(),
    block: z
      .object({
        header: z
          .object({ chain_id: z.string(), height: z.string(), time: z.string(), proposer_address: z.string() })
          .passthrough(),
        data: z.object({ txs: z.array(z.string()) }).passthrough(),
      })
      .passthrough(),
  })
  .passthrough()

export const rpcStatusSchema = z
  .object({
    result: z
      .object({
        node_info: z.object({ network: z.string(), moniker: z.string(), version: z.string() }).passthrough(),
        sync_info: z
          .object({
            latest_block_height: z.string(),
            latest_block_time: z.string(),
            catching_up: z.boolean(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough()

export type Ecosystem = z.infer<typeof ecosystemSchema>
export type CredentialSchema = z.infer<typeof credentialSchemaSchema>
export type Participant = z.infer<typeof participantSchema>
export type Corporation = z.infer<typeof corporationSchema>
export type TrustDeposit = z.infer<typeof trustDepositSchema>
export type ActivityItem = z.infer<typeof activityItemSchema>
export type TrustVerdict = z.infer<typeof trustVerdictSchema>
export type IndexerEvent = z.infer<typeof indexerEventSchema>
export type GroupProposal = z.infer<typeof groupProposalSchema>
export type GroupVote = z.infer<typeof groupVoteSchema>
export type Group = z.infer<typeof groupSchema>
export type ExchangeRate = z.infer<typeof exchangeRateSchema>
export type Validator = z.infer<typeof validatorSchema>
export type GovProposal = z.infer<typeof govProposalSchema>
export type ChainBlock = z.infer<typeof blockSchema>
