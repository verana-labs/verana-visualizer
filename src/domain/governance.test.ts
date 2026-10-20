import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import type { GovProposal, Group, GroupProposal } from '@/lib/api/schemas'
import {
  binaryVersion,
  corporationConstellations,
  formatProposalStatus,
  fromGovProposal,
  fromGroupProposal,
  isUpgradeMessage,
  parsePlanInfo,
  parseProposalMetadata,
  proposalEntityId,
  totalVotingPower,
  turnoutPercent,
  upgradeExecution,
  upgradePlanOf,
  withProposals,
} from './governance'

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const groupProposals = fixture<GroupProposal[]>('group-proposals')
const group = fixture<Group>('group-members')

const upgradeMsg = (plan: Record<string, unknown>) => ({
  '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
  authority: 'verana10d07y265gmmuvt4z0w9aw880jnsr700j5s9gk8',
  plan,
})

const binaries = {
  'linux/amd64': 'https://github.com/verana-labs/verana/releases/download/v0.9-dev.7/veranad-v0.9-dev.7-linux-amd64',
  'darwin/arm64': 'https://github.com/verana-labs/verana/releases/download/v0.9-dev.7/veranad-darwin-arm64',
}

const govProposal = (over: Partial<GovProposal> = {}): GovProposal => ({
  id: '12',
  status: 'PROPOSAL_STATUS_VOTING_PERIOD',
  submit_time: '2026-10-01T10:00:00Z',
  voting_start_time: '2026-10-01T10:00:00Z',
  voting_end_time: '2026-10-03T10:00:00Z',
  title: 'Upgrade to v0.9',
  summary: 'Moves the chain to v0.9',
  proposer: 'verana1proposer',
  metadata: 'ipfs://cid',
  messages: [upgradeMsg({ name: 'v0.9', height: '120000', time: '0001-01-01T00:00:00Z', info: '' })],
  final_tally_result: { yes_count: '600', no_count: '100', abstain_count: '200', no_with_veto_count: '100' },
  ...over,
})

describe('upgrade proposal parsing', () => {
  it('detects a software upgrade message by type', () => {
    expect(isUpgradeMessage(upgradeMsg({}))).toBe(true)
    expect(isUpgradeMessage({ '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgradeV2' })).toBe(true)
    expect(isUpgradeMessage({ '@type': '/cosmos.gov.v1.MsgExecLegacyContent' })).toBe(false)
    expect(isUpgradeMessage({})).toBe(false)
  })

  it('extracts the plan name, height and info from the first upgrade message', () => {
    const plan = upgradePlanOf([
      { '@type': '/cosmos.bank.v1beta1.MsgSend' },
      upgradeMsg({ name: 'v0.9-dev.7', height: '123456', time: '0001-01-01T00:00:00Z', info: '{"binaries":{}}' }),
      upgradeMsg({ name: 'second', height: '1' }),
    ])
    expect(plan).toEqual({
      name: 'v0.9-dev.7',
      height: '123456',
      time: '0001-01-01T00:00:00Z',
      info: '{"binaries":{}}',
      authority: 'verana10d07y265gmmuvt4z0w9aw880jnsr700j5s9gk8',
    })
  })

  it('returns no plan when no message is an upgrade or the plan is missing', () => {
    expect(upgradePlanOf([])).toBeNull()
    expect(upgradePlanOf([{ '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade' }])).toBeNull()
  })

  it('parses plan info JSON and fixes binary file names that embed the version', () => {
    const info = parsePlanInfo(JSON.stringify({ binaries }))
    expect(info?.binaries).toEqual({
      'linux/amd64': 'https://github.com/verana-labs/verana/releases/download/v0.9-dev.7/veranad-linux-amd64',
      'darwin/arm64': 'https://github.com/verana-labs/verana/releases/download/v0.9-dev.7/veranad-darwin-arm64',
    })
  })

  it('keeps non GitHub binary URLs as they are', () => {
    const info = parsePlanInfo(JSON.stringify({ binaries: { 'linux/amd64': 'https://example.org/veranad' } }))
    expect(info?.binaries).toEqual({ 'linux/amd64': 'https://example.org/veranad' })
  })

  it('returns null for plan info that is not a JSON object', () => {
    expect(parsePlanInfo('')).toBeNull()
    expect(parsePlanInfo('{"binaries":')).toBeNull()
    expect(parsePlanInfo('"just a string"')).toBeNull()
  })

  it('reads the binary version from the release URL, then the plan name, then the title', () => {
    expect(binaryVersion({ name: 'upgrade', info: JSON.stringify({ binaries }) }, null)).toBe('v0.9-dev.7')
    expect(binaryVersion({ name: 'v1.2.0', info: '' }, null)).toBe('v1.2.0')
    expect(binaryVersion({ name: '', info: '{"version":"v2.0.0"}' }, null)).toBe('v2.0.0')
    expect(binaryVersion({ name: '', info: '' }, 'Upgrade to v3.1.4')).toBe('v3.1.4')
    expect(binaryVersion({ name: '', info: '' }, null)).toBeNull()
  })

  it('adds vote counts with BigInt so large tallies keep every digit', () => {
    expect(
      totalVotingPower({
        yes_count: '900000000000000000001',
        no_count: '1',
        abstain_count: '0',
        no_with_veto_count: '',
      })
    ).toBe('900000000000000000002')
  })

  it('formats turnout with 2 to 4 decimals and returns null without bonded tokens', () => {
    expect(turnoutPercent('500', '1000')).toBe('50.00')
    expect(turnoutPercent('25', '1000')).toBe('2.500')
    expect(turnoutPercent('1', '1000')).toBe('0.1000')
    expect(turnoutPercent('1', '0')).toBeNull()
    expect(turnoutPercent('1', 'not a number')).toBeNull()
  })

  it('derives the execution state from the proposal status and the chain height', () => {
    expect(upgradeExecution('PROPOSAL_STATUS_VOTING_PERIOD', '100', 50)).toEqual({
      status: 'not_executed',
      message: 'Not executed (proposal status: VOTING_PERIOD; target height 100)',
    })
    expect(upgradeExecution('PROPOSAL_STATUS_PASSED', '100', 150)).toEqual({
      status: 'executed',
      message: 'Reached target height 100',
    })
    expect(upgradeExecution('PROPOSAL_STATUS_PASSED', '100', 50)).toEqual({
      status: 'pending',
      message: 'Not executed (target height 100; current height 50)',
    })
    expect(upgradeExecution('PROPOSAL_STATUS_PASSED', '100', null)).toEqual({
      status: 'not_executed',
      message: 'Not executed (target height 100; current height unknown)',
    })
    expect(upgradeExecution('PROPOSAL_STATUS_PASSED', 'soon', 50).status).toBe('unknown')
  })

  it('formats chain and group statuses as readable words', () => {
    expect(formatProposalStatus('PROPOSAL_STATUS_VOTING_PERIOD')).toBe('voting period')
    expect(formatProposalStatus('ACCEPTED')).toBe('accepted')
    expect(formatProposalStatus('PROPOSAL_STATUS_SUBMITTED')).toBe('submitted')
  })
})

describe('parseProposalMetadata', () => {
  it('reads title and summary from JSON metadata', () => {
    expect(parseProposalMetadata('{"title":"Add Alice","summary":"Adds a member"}')).toEqual({
      title: 'Add Alice',
      summary: 'Adds a member',
      json: { title: 'Add Alice', summary: 'Adds a member' },
      raw: '{"title":"Add Alice","summary":"Adds a member"}',
    })
  })

  it('keeps plain text and broken JSON as raw text without throwing', () => {
    expect(parseProposalMetadata('Grant operator authorization')).toEqual({
      title: null,
      summary: null,
      json: null,
      raw: 'Grant operator authorization',
    })
    expect(parseProposalMetadata('{"title": "half')).toEqual({
      title: null,
      summary: null,
      json: null,
      raw: '{"title": "half',
    })
  })

  it('ignores non string title fields and empty metadata', () => {
    expect(parseProposalMetadata('{"title":42}').title).toBeNull()
    expect(parseProposalMetadata('')).toEqual({ title: null, summary: null, json: null, raw: null })
    expect(parseProposalMetadata(null).raw).toBeNull()
  })
})

describe('proposal records', () => {
  it('uses distinct ids for corporation and chain proposals', () => {
    expect(proposalEntityId('group', 36)).toBe('proposal:group-36')
    expect(proposalEntityId('chain', 12)).toBe('proposal:12')
  })

  it('builds a corporation proposal from the indexer record', () => {
    const p = fromGroupProposal(groupProposals[0])
    expect(p).toMatchObject({
      id: 'proposal:group-36',
      source: 'group',
      number: 36,
      corporationId: 4,
      status: 'ACCEPTED',
      open: false,
      submitTime: '2026-10-16T21:36:44.497Z',
      votingEnd: '2026-10-21T21:36:44.497Z',
      proposers: ['verana1a7lnp2e3pscjxqah6nq6a5nynrzdj5rrztw30t'],
      messageTypes: ['/verana.de.v1.MsgGrantOperatorAuthorization'],
      executorResult: 'SUCCESS',
    })
    expect(p.title).toBe('Grant operator authorization')
  })

  it('titles a corporation proposal from its metadata when the metadata has one', () => {
    const p = fromGroupProposal({ ...groupProposals[0], metadata: '{"title":"Rotate keys","summary":"s"}' })
    expect(p.title).toBe('Rotate keys')
    expect(p.summary).toBe('s')
    expect(fromGroupProposal({ ...groupProposals[0], metadata: 'Plain words' }).title).toBe('Plain words')
  })

  it('marks submitted corporation proposals as open and keeps their live tally', () => {
    const p = fromGroupProposal({
      ...groupProposals[0],
      status: 'SUBMITTED',
      tally: { yes_count: '2', no_count: '1', abstain_count: '0', no_with_veto_count: '0' },
    })
    expect(p.open).toBe(true)
    expect(p.tally).toEqual({ yes: '2', no: '1', abstain: '0', veto: '0' })
  })

  it('builds a chain proposal with its upgrade plan and final tally', () => {
    const p = fromGovProposal(govProposal())
    expect(p).toMatchObject({
      id: 'proposal:12',
      source: 'chain',
      number: 12,
      corporationId: null,
      title: 'Upgrade to v0.9',
      summary: 'Moves the chain to v0.9',
      open: true,
      proposers: ['verana1proposer'],
      tally: { yes: '600', no: '100', abstain: '200', veto: '100' },
    })
    expect(p.upgrade?.height).toBe('120000')
  })

  it('falls back to a numbered title when a chain proposal has none', () => {
    expect(fromGovProposal(govProposal({ title: '', messages: [] })).title).toBe('Chain proposal #12')
  })
})

describe('withProposals', () => {
  const model = testnetModel()
  const proposals = [fromGroupProposal(groupProposals[0]), fromGovProposal(govProposal())]
  const next = withProposals(model, proposals)

  it('adds proposal entities without touching the base model', () => {
    expect(next.entities.get('proposal:group-36')).toMatchObject({ kind: 'proposal', name: proposals[0].title })
    expect(next.entities.has('proposal:12')).toBe(true)
    expect(model.entities.has('proposal:group-36')).toBe(false)
    expect(next.entities.size).toBe(model.entities.size + 2)
    expect(next.agents).toBe(model.agents)
    expect(next.raw).toBe(model.raw)
  })

  it('hangs a corporation proposal under its corporation', () => {
    expect(next.parentOf('proposal:group-36')).toBe('corporation:4')
    expect(next.childrenOf('corporation:4')).toContain('proposal:group-36')
    expect(next.chainToRoot('proposal:group-36')).toEqual(['proposal:group-36', ...model.chainToRoot('corporation:4')])
    expect(next.neighbors('proposal:group-36').has('corporation:4')).toBe(true)
    expect(next.related('proposal:group-36').has('corporation:4')).toBe(true)
  })

  it('leaves chain proposals without a parent', () => {
    expect(next.parentOf('proposal:12')).toBeNull()
    expect(next.chainToRoot('proposal:12')).toEqual(['proposal:12'])
  })

  it('skips a corporation proposal whose corporation is not in the model', () => {
    const orphan = fromGroupProposal({ ...groupProposals[0], id: 999, corporation_id: 99999 })
    const result = withProposals(model, [orphan])
    expect(result.parentOf('proposal:group-999')).toBeNull()
    expect(result.entities.has('proposal:group-999')).toBe(true)
  })
})

describe('corporationConstellations', () => {
  it('lists each group member with its weight and share of the total weight', () => {
    const second = {
      ...group,
      corporation_id: 7,
      total_weight: '4',
      members: [
        { address: 'verana1a', weight: '3', metadata: 'lead', added_at: null },
        { address: 'verana1b', weight: '1', metadata: '', added_at: null },
      ],
    }
    const constellations = corporationConstellations([group, second])
    expect(constellations).toEqual([
      {
        corporation: 'corporation:2',
        totalWeight: '1',
        members: [{ address: 'verana1dnucfytqvaat3a5m2tcc3dan0e3x8826h0fe6c', weight: '1', share: 1, metadata: '' }],
      },
      {
        corporation: 'corporation:7',
        totalWeight: '4',
        members: [
          { address: 'verana1a', weight: '3', share: 0.75, metadata: 'lead' },
          { address: 'verana1b', weight: '1', share: 0.25, metadata: '' },
        ],
      },
    ])
  })
})
