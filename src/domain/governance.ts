import type { QueryInfo } from '@/lib/api/query-info'
import type { GovProposal, Group, GroupProposal, GroupVote } from '@/lib/api/schemas'
import { safeHttpUrl } from '@/lib/safe-url'
import type { Entity, EntityId, NetworkModel } from './network-model'

export type ProposalSource = 'group' | 'chain'

export interface Tally {
  yes: string
  no: string
  abstain: string
  veto: string
}

export interface UpgradePlan {
  name: string
  height: string
  time: string
  info: string
  authority: string | null
}

export interface ParsedPlanInfo {
  binaries?: Record<string, string>
  version?: unknown
  binary?: unknown
  [key: string]: unknown
}

export interface ProposalMetadata {
  title: string | null
  summary: string | null
  json: Record<string, unknown> | null
  raw: string | null
}

export interface GovernanceProposal {
  id: EntityId
  source: ProposalSource
  number: number
  corporationId: number | null
  title: string
  summary: string | null
  metadata: ProposalMetadata
  status: string
  open: boolean
  submitTime: string | null
  votingStart: string | null
  votingEnd: string | null
  proposers: string[]
  tally: Tally | null
  messageTypes: string[]
  upgrade: UpgradePlan | null
  executorResult: string | null
}

export interface ConstellationMember {
  address: string
  weight: string
  share: number
  metadata: string
}

export interface Constellation {
  corporation: EntityId
  totalWeight: string
  members: ConstellationMember[]
}

export type VotesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; votes: GroupVote[]; query: QueryInfo }

export interface GovernanceScene {
  proposals: Map<EntityId, GovernanceProposal>
  constellations: Constellation[]
  votes: Map<EntityId, VotesState>
  queries: { groupProposals: QueryInfo; govProposals: QueryInfo | null }
}

export type UpgradeExecutionStatus = 'executed' | 'pending' | 'not_executed' | 'unknown'

const UPGRADE_MESSAGE_TYPE = '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade'
const PASSED = 'PROPOSAL_STATUS_PASSED'
const OPEN_STATUSES = new Set(['SUBMITTED', 'VOTING_PERIOD', 'DEPOSIT_PERIOD'])
const PROPOSAL_TIER = 3

export const PROPOSAL_COLORS = {
  open: '#38E1FF',
  accepted: '#29C68C',
  rejected: '#ff8a8a',
  closed: '#94a3b8',
} as const

type Message = Record<string, unknown>

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const bareStatus = (status: string) => status.replace(/^PROPOSAL_STATUS_/, '')

export function formatProposalStatus(status: string): string {
  return bareStatus(status).toLowerCase().replace(/_/g, ' ')
}

export function isUpgradeMessage(message: Message): boolean {
  const type = text(message['@type'])
  return type === UPGRADE_MESSAGE_TYPE || type.includes('MsgSoftwareUpgrade')
}

export function upgradePlanOf(messages: readonly Message[]): UpgradePlan | null {
  const message = messages.find(isUpgradeMessage)
  if (!message || !isRecord(message.plan)) return null
  const { plan } = message
  return {
    name: text(plan.name),
    height: String(plan.height ?? ''),
    time: text(plan.time),
    info: text(plan.info),
    authority: text(message.authority) || null,
  }
}

function fixBinaryUrl(url: string): string {
  const match = url.match(/^(https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/)([^/]+)\/(.+)$/)
  if (!match) return url
  const [, basePath, version, filename] = match
  if (/^veranad-(linux|darwin)-/.test(filename)) return url
  const platform = filename.match(/^veranad-.*?(-(?:linux|darwin)-.+)$/)
  return platform ? `${basePath}${version}/veranad-${platform[1].slice(1)}` : url
}

export function parsePlanInfo(info: string): ParsedPlanInfo | null {
  if (!info) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(info)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  if (!isRecord(parsed.binaries)) return parsed
  const binaries: Record<string, string> = {}
  for (const [platform, url] of Object.entries(parsed.binaries))
    if (typeof url === 'string') binaries[platform] = fixBinaryUrl(url)
  return { ...parsed, binaries }
}

const VERSION = /(v[\d.]+(?:-[a-z]+\.\d+)?)/i

export function binaryVersion(plan: Pick<UpgradePlan, 'name' | 'info'>, title: string | null): string | null {
  let version: string | null = plan.name || null
  const info = parsePlanInfo(plan.info)
  if (info?.binaries) {
    const { binaries } = info
    const url =
      binaries['linux/amd64'] ||
      binaries['linux/arm64'] ||
      binaries['darwin/amd64'] ||
      binaries['darwin/arm64'] ||
      Object.values(binaries).find(Boolean)
    const match =
      url?.match(/\/releases\/download\/(v[\d.]+(?:-[a-z]+\.\d+)?)/i) ||
      url?.match(/veranad-(v[\d.]+(?:-[a-z]+\.\d+)?)/i) ||
      url?.match(VERSION)
    if (match?.[1]) version = match[1]
  } else if (typeof info?.version === 'string') {
    version = info.version
  } else if (typeof info?.binary === 'string') {
    version = info.binary
  }
  if (!version && title) version = title.match(VERSION)?.[1] ?? null
  return version
}

export function totalVotingPower(tally: {
  yes_count?: string
  no_count?: string
  abstain_count?: string
  no_with_veto_count?: string
}): string {
  return [tally.yes_count, tally.no_count, tally.abstain_count, tally.no_with_veto_count]
    .reduce((sum, value) => sum + BigInt(value || '0'), BigInt(0))
    .toString()
}

export function turnoutPercent(totalPower: string, bondedTokens: string): string | null {
  try {
    const bonded = BigInt(bondedTokens)
    if (bonded === BigInt(0)) return null
    const percent = Number((BigInt(totalPower || '0') * BigInt(100_000_000)) / bonded) / 1_000_000
    if (percent >= 10) return percent.toFixed(2)
    if (percent >= 1) return percent.toFixed(3)
    return percent.toFixed(4)
  } catch {
    return null
  }
}

export function upgradeExecution(
  status: string,
  planHeight: string,
  currentHeight: number | null
): { status: UpgradeExecutionStatus; message: string } {
  if (status !== PASSED)
    return {
      status: 'not_executed',
      message: `Not executed (proposal status: ${bareStatus(status)}; target height ${planHeight})`,
    }
  if (currentHeight === null)
    return { status: 'not_executed', message: `Not executed (target height ${planHeight}; current height unknown)` }
  const target = Number.parseInt(planHeight, 10)
  if (Number.isNaN(target)) return { status: 'unknown', message: 'Unknown (invalid height values)' }
  if (target <= currentHeight) return { status: 'executed', message: `Reached target height ${planHeight}` }
  return { status: 'pending', message: `Not executed (target height ${planHeight}; current height ${currentHeight})` }
}

export function parseProposalMetadata(metadata: string | null | undefined): ProposalMetadata {
  if (!metadata) return { title: null, summary: null, json: null, raw: null }
  let parsed: unknown = null
  try {
    parsed = JSON.parse(metadata)
  } catch {
    parsed = null
  }
  const json = isRecord(parsed) ? parsed : null
  return {
    title: text(json?.title) || null,
    summary: text(json?.summary) || null,
    json,
    raw: metadata,
  }
}

export function metadataLinks(metadata: ProposalMetadata): { key: string; url: string }[] {
  if (!metadata.json) return []
  return Object.entries(metadata.json).flatMap(([key, value]) => {
    const url = safeHttpUrl(value)
    return url ? [{ key, url }] : []
  })
}

export function proposalEntityId(source: ProposalSource, n: number): EntityId {
  return source === 'group' ? `proposal:group-${n}` : `proposal:${n}`
}

function messageTitle(type: string): string {
  const name = type.slice(type.lastIndexOf('.') + 1).replace(/^Msg/, '')
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function tallyOf(raw: GroupProposal['tally']): Tally | null {
  if (!raw) return null
  const count = (value: string | number | undefined) => String(value ?? '0')
  return {
    yes: count(raw.yes_count),
    no: count(raw.no_count),
    abstain: count(raw.abstain_count),
    veto: count(raw.no_with_veto_count),
  }
}

const messageTypes = (messages: readonly Message[]) => messages.flatMap((m) => text(m['@type']) || [])

export function fromGroupProposal(p: GroupProposal): GovernanceProposal {
  const metadata = parseProposalMetadata(p.metadata)
  const types = messageTypes(p.messages)
  const plainMetadata = metadata.json === null ? metadata.raw : null
  return {
    id: proposalEntityId('group', p.id),
    source: 'group',
    number: p.id,
    corporationId: p.corporation_id,
    title: metadata.title ?? plainMetadata ?? (types[0] ? messageTitle(types[0]) : `Corporation proposal #${p.id}`),
    summary: metadata.summary,
    metadata,
    status: p.status,
    open: OPEN_STATUSES.has(bareStatus(p.status)),
    submitTime: p.submit_time,
    votingStart: null,
    votingEnd: p.voting_period_end,
    proposers: p.proposers,
    tally: tallyOf(p.tally ?? p.final_tally_result),
    messageTypes: types,
    upgrade: upgradePlanOf(p.messages),
    executorResult: p.executor_result ?? null,
  }
}

export function fromGovProposal(p: GovProposal): GovernanceProposal {
  const n = Number(p.id)
  if (!Number.isInteger(n)) throw new Error(`Chain proposal id ${p.id} is not an integer`)
  const metadata = parseProposalMetadata(p.metadata)
  const messages = p.messages ?? []
  return {
    id: proposalEntityId('chain', n),
    source: 'chain',
    number: n,
    corporationId: null,
    title: p.title || metadata.title || `Chain proposal #${n}`,
    summary: p.summary || metadata.summary,
    metadata,
    status: p.status,
    open: OPEN_STATUSES.has(bareStatus(p.status)),
    submitTime: p.submit_time ?? null,
    votingStart: p.voting_start_time ?? null,
    votingEnd: p.voting_end_time ?? null,
    proposers: p.proposer ? [p.proposer] : [],
    tally: tallyOf(p.final_tally_result),
    messageTypes: messageTypes(messages),
    upgrade: upgradePlanOf(messages),
    executorResult: null,
  }
}

export function proposalColor(p: Pick<GovernanceProposal, 'open' | 'status'>): string {
  if (p.open) return PROPOSAL_COLORS.open
  const status = bareStatus(p.status)
  if (status === 'ACCEPTED' || status === 'PASSED') return PROPOSAL_COLORS.accepted
  if (status === 'REJECTED' || status === 'FAILED') return PROPOSAL_COLORS.rejected
  return PROPOSAL_COLORS.closed
}

export function corporationConstellations(groups: readonly Group[]): Constellation[] {
  return groups.map((group) => {
    const total = Number(group.total_weight)
    return {
      corporation: `corporation:${group.corporation_id}`,
      totalWeight: String(group.total_weight),
      members: group.members.map((member) => ({
        address: member.address,
        weight: String(member.weight),
        share: total > 0 ? Number(member.weight) / total : 0,
        metadata: member.metadata ?? '',
      })),
    }
  })
}

export function withProposals(model: NetworkModel, proposals: readonly GovernanceProposal[]): NetworkModel {
  const entities = new Map(model.entities)
  const parents = new Map<EntityId, EntityId>()
  const children = new Map<EntityId, EntityId[]>()
  for (const p of proposals) {
    const corporation: EntityId | null = p.corporationId === null ? null : `corporation:${p.corporationId}`
    const owner = corporation ? model.entities.get(corporation) : undefined
    const entity: Entity = {
      id: p.id,
      kind: 'proposal',
      name: p.title,
      ecosystemId: owner?.ecosystemId ?? null,
      color: proposalColor(p),
      tier: PROPOSAL_TIER,
      did: null,
    }
    entities.set(p.id, entity)
    if (!owner || !corporation) continue
    parents.set(p.id, corporation)
    children.set(corporation, [...(children.get(corporation) ?? []), p.id])
  }

  const parentOf = (id: EntityId) => parents.get(id) ?? model.parentOf(id)
  const childrenOf = (id: EntityId) => [...model.childrenOf(id), ...(children.get(id) ?? [])]
  const chainToRoot = (id: EntityId): EntityId[] => {
    const parent = parents.get(id)
    if (parent) return [id, ...model.chainToRoot(parent)]
    return entities.get(id)?.kind === 'proposal' ? [id] : model.chainToRoot(id)
  }
  const neighbors = (id: EntityId) => {
    const parent = parents.get(id)
    if (parent) return new Set<EntityId>([parent])
    return new Set<EntityId>([...model.neighbors(id), ...(children.get(id) ?? [])])
  }
  const related = (id: EntityId) => {
    if (entities.get(id)?.kind === 'proposal') return new Set<EntityId>(chainToRoot(id))
    return new Set<EntityId>([...model.related(id), ...(children.get(id) ?? [])])
  }

  return { ...model, entities, parentOf, childrenOf, chainToRoot, neighbors, related }
}
