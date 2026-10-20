import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildNetworkModel, type EntityId, type RawNetwork } from '@/domain/network-model'
import { participantState } from '@/domain/participant-state'
import type { QueryInfo } from '@/lib/api/query-info'
import type { Ecosystem } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'
import { Inspector } from './inspector'

const fixture = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const FRONTEND = 'https://app.testnet.verana.network'

const baseRaw = (): RawNetwork => ({
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
})

const listQuery = (path: string): QueryInfo => ({
  method: 'GET',
  url: `https://idx.testnet.verana.network${path}?limit=1024&sort=-id`,
  headers: {},
})

const QUERIES = {
  ecosystems: listQuery('/v4/ecosystem/list'),
  schemas: listQuery('/v4/credential-schema/list'),
  participants: listQuery('/v4/participant/list'),
  corporations: listQuery('/v4/corporation/list'),
  dids: listQuery('/v4/verifiable-trust/dids'),
}

const show = (raw: RawNetwork, selected: EntityId, frontendUrl = FRONTEND) => {
  useObservatory.setState({ model: buildNetworkModel(raw), selected, queries: QUERIES, agentVerdicts: new Map() })
  return render(<Inspector frontendUrl={frontendUrl} chainId="vna-testnet-1" />)
}

const fact = (label: string) => {
  const key = within(screen.getByTestId('inspector')).getByText(label)
  return within(key.parentElement as HTMLElement).getByTestId('value').textContent
}

const withGovernanceUrl = (raw: RawNetwork, id: number, url: string): RawNetwork => ({
  ...raw,
  ecosystems: raw.ecosystems.map(
    (eco): Ecosystem =>
      eco.id !== id
        ? eco
        : { ...eco, versions: eco.versions.map((v) => ({ ...v, documents: v.documents.map((d) => ({ ...d, url })) })) }
  ),
})

beforeEach(() => {
  useObservatory.setState({ selected: null, hovered: null, model: null })
})

describe('Inspector', () => {
  it('shows deposits and weight in VNA and fees in the schema pricing unit', () => {
    const raw = baseRaw()
    raw.participants = raw.participants.map((p) =>
      p.id === 158
        ? { ...p, deposit: '2500000', validation_fees: '1000000', issuance_fees: '0', verification_fees: '5' }
        : p
    )
    raw.ecosystems = raw.ecosystems.map((e, i) => (i === 0 ? { ...e, weight: '7000000' } : e))
    const { unmount } = show(raw, 'participant:158')
    expect(fact('Trust deposit')).toBe('2.5 VNA')
    expect(fact('Fees (validation · issue · verify)')).toBe('1 VNA · 0 VNA · 0.000005 VNA')
    unmount()
    const eco = show(raw, `ecosystem:${raw.ecosystems[0].id}`)
    expect(fact('Trust weight')).toBe('7 VNA')
    eco.unmount()
    show(raw, 'corporation:2')
    expect(fact('Trust deposit')).toBe('0.05 VNA')
  })

  it.each([
    ['ecosystem:1', 'VPR spec ↗', 'https://verana-labs.github.io/verifiable-trust-vpr-spec/versions/v4/#ecosystem'],
    [
      'participant:158',
      'VPR spec ↗',
      'https://verana-labs.github.io/verifiable-trust-vpr-spec/versions/v4/#participant',
    ],
    [
      'corporation:34',
      'VPR spec ↗',
      'https://verana-labs.github.io/verifiable-trust-vpr-spec/versions/v4/#corporation',
    ],
  ] as [EntityId, string, string][])('links %s to its section of the published spec', (id, name, href) => {
    show(baseRaw(), id)
    expect(within(screen.getByTestId('inspector')).getByRole('link', { name })).toHaveAttribute('href', href)
  })

  it('links schemas and services to their specs', () => {
    const raw = baseRaw()
    const schemaId = raw.schemas[0].id
    const { unmount } = show(raw, `schema:${schemaId}`)
    expect(screen.getByRole('link', { name: 'VPR spec ↗' })).toHaveAttribute(
      'href',
      'https://verana-labs.github.io/verifiable-trust-vpr-spec/versions/v4/#credentialschema'
    )
    unmount()
    const agent = buildNetworkModel(raw).agents[0]
    show(raw, agent.id)
    expect(screen.getByRole('link', { name: 'Verifiable Trust spec ↗' })).toHaveAttribute(
      'href',
      'https://verana-labs.github.io/verifiable-trust-spec/versions/v4/#what-is-a-verifiable-service-vs'
    )
  })

  it('renders nothing without a selection', () => {
    useObservatory.setState({ model: buildNetworkModel(baseRaw()), selected: null })
    const { container } = render(<Inspector frontendUrl={FRONTEND} chainId="vna-testnet-1" />)
    expect(container.querySelector('[data-testid="inspector"]')).toBeNull()
  })

  it('shows the role chip, state chip and accrediting parent of a participant', () => {
    const raw = baseRaw()
    show(raw, 'participant:158')
    const panel = screen.getByTestId('inspector')
    const p158 = raw.participants.find((p) => p.id === 158)
    if (!p158) throw new Error('fixture participant 158 missing')
    expect(within(panel).getByTestId('role-chip')).toHaveTextContent('Issuer')
    expect(within(panel).getByTestId('state-chip')).toHaveTextContent(participantState(p158, new Date()))
    const accredited = within(panel).getByText('Accredited by').closest('section')
    if (!accredited) throw new Error('no accredited-by section')
    expect(within(accredited).getByText('ECS Ecosystem')).toBeInTheDocument()
    expect(within(accredited).getByText('ECS')).toBeInTheDocument()
  })

  it('deep links ecosystems, participants and schemas into the Verana app', () => {
    const raw = baseRaw()
    const eco = show(raw, 'ecosystem:2')
    const links = [...eco.container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(links).toContain(`${FRONTEND}/ecosystems/2`)
    const schemaId = raw.schemas.find((s) => s.ecosystem_id === 2 && !s.archived)?.id
    expect(links).toContain(`${FRONTEND}/credential-schemas/${schemaId}`)
    eco.unmount()

    const participant = show(raw, 'participant:158')
    expect(participant.container.querySelector(`a[href="${FRONTEND}/participants/158"]`)).not.toBeNull()
    participant.unmount()

    show(raw, `schema:${schemaId}` as EntityId)
    expect(screen.getByRole('link', { name: /open in verana app/i }).getAttribute('href')).toBe(
      `${FRONTEND}/credential-schemas/${schemaId}`
    )
  })

  it('opens every external link in a new tab without a referrer', () => {
    const { container } = show(baseRaw(), 'ecosystem:2')
    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('target')).toBe('_blank')
      expect(a.getAttribute('rel')).toBe('noreferrer')
    }
  })

  it('renders no link for a javascript: governance document', () => {
    const { container } = show(withGovernanceUrl(baseRaw(), 2, 'javascript:alert(1)'), 'ecosystem:2')
    expect(screen.queryByRole('link', { name: /governance framework/i })).toBeNull()
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).not.toMatch(/^javascript:/i)
  })

  it('links a valid governance document', () => {
    show(withGovernanceUrl(baseRaw(), 2, 'https://example.org/egf.pdf'), 'ecosystem:2')
    expect(screen.getByRole('link', { name: /governance framework/i }).getAttribute('href')).toBe(
      'https://example.org/egf.pdf'
    )
  })

  it('renders a hostile schema title as text', () => {
    const raw = baseRaw()
    const target = raw.schemas.find((s) => s.ecosystem_id === 2 && !s.archived)
    if (!target) throw new Error('no ECS schema in the fixture')
    const hostile = '<img src=x onerror=alert(1)>'
    raw.schemas = raw.schemas.map((s) => (s.id === target.id ? { ...s, title: hostile } : s))
    const eco = show(raw, 'ecosystem:2')
    expect(eco.container.querySelector('img')).toBeNull()
    expect(screen.getByText(hostile)).toBeInTheDocument()
    eco.unmount()

    const schema = show(raw, `schema:${target.id}` as EntityId)
    expect(schema.container.querySelector('img')).toBeNull()
    expect(screen.getByRole('heading', { name: hostile })).toBeInTheDocument()
  })

  it('ends each panel with the query that produced its data', () => {
    const raw = baseRaw()
    const cases: [EntityId, QueryInfo][] = [
      ['ecosystem:2', QUERIES.ecosystems],
      ['participant:158', QUERIES.participants],
      [`agent:${raw.dids[0]}` as EntityId, QUERIES.dids],
      ['corporation:3', QUERIES.corporations],
    ]
    for (const [id, query] of cases) {
      const view = show(raw, id)
      const panel = screen.getByTestId('inspector')
      const showQuery = within(panel).getByTestId('show-query')
      expect(showQuery).toHaveTextContent(query.url)
      expect(panel.lastElementChild?.contains(showQuery)).toBe(true)
      view.unmount()
    }
  })

  it('selects a parent from the accredited-by list', async () => {
    show(baseRaw(), 'participant:158')
    await userEvent.click(screen.getByRole('button', { name: /ECS Ecosystem/ }))
    expect(useObservatory.getState().selected).toBe('participant:5')
  })

  it('closes on Escape and on the close button', async () => {
    show(baseRaw(), 'ecosystem:2')
    await userEvent.keyboard('{Escape}')
    expect(useObservatory.getState().selected).toBeNull()
    act(() => useObservatory.setState({ selected: 'ecosystem:2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close inspector' }))
    expect(useObservatory.getState().selected).toBeNull()
  })

  it('counts participants that are not terminated, like the indexer', () => {
    const raw = baseRaw()
    const view = show(raw, 'ecosystem:2')
    expect(fact('Participants')).toBe('90')
    view.unmount()
    show(raw, 'schema:4')
    expect(fact('Participants')).toBe(String(raw.schemas.find((s) => s.id === 4)?.participants))
    expect(fact('Participants')).toBe('46')
  })

  it('builds no link when the frontend url is not http(s)', () => {
    const { container } = show(baseRaw(), 'ecosystem:2', 'javascript:alert(1)//')
    for (const a of container.querySelectorAll('a')) expect(a.getAttribute('href')).not.toMatch(/^javascript:/i)
    expect(screen.queryByRole('link', { name: /open in verana app/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /BadgeCredential/ })).toBeNull()
  })

  it('says so when the selected row is missing from the loaded data', () => {
    const raw = baseRaw()
    useObservatory.setState({ model: buildNetworkModel(raw), selected: 'participant:158', queries: QUERIES })
    raw.participants = raw.participants.filter((p) => p.id !== 158)
    render(<Inspector frontendUrl={FRONTEND} chainId="vna-testnet-1" />)
    expect(screen.getByTestId('inspector')).toHaveTextContent('Not found on vna-testnet-1')
  })
})
