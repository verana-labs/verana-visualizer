import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { fromGovProposal, fromGroupProposal, withProposals } from '@/domain/governance'
import type { GroupProposal } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'
import { recorded, testnetModel } from '../../../tests/support/recorded'
import { GovernancePanel } from './governance-panel'
import type { GovernanceData } from './load-governance'

const groupProposals = recorded<GroupProposal[]>('group-proposals')

const query = (path: string) => ({
  method: 'GET' as const,
  url: `https://idx.testnet.verana.network${path}`,
  headers: {},
})
const HOSTILE = '<img src=x onerror="alert(1)">Rotate keys'

const data = (over: Partial<GovernanceData> = {}): GovernanceData => ({
  proposals: [
    fromGroupProposal({ ...groupProposals[0], status: 'SUBMITTED', metadata: JSON.stringify({ title: HOSTILE }) }),
    fromGovProposal({ id: '5', status: 'PROPOSAL_STATUS_PASSED', title: 'Raise max validators', summary: null }),
  ],
  constellations: [
    {
      corporation: 'corporation:4',
      totalWeight: '3',
      members: [
        { address: 'verana1a', weight: '2', share: 2 / 3, metadata: '' },
        { address: 'verana1b', weight: '1', share: 1 / 3, metadata: '' },
      ],
    },
  ],
  chain: { status: 'ready' },
  queries: { groupProposals: query('/v4/group/proposals'), govProposals: query('/cosmos/gov/v1/proposals') },
  ...over,
})

const base = testnetModel()

afterEach(() => useObservatory.setState({ selected: null }))

describe('GovernancePanel', () => {
  it('renders proposal titles as text, never as markup', () => {
    const ready = data()
    const { container } = render(
      <GovernancePanel
        chainId="vna-testnet-1"
        model={withProposals(base, ready.proposals)}
        state={{ status: 'ready', data: ready }}
      />
    )
    expect(screen.getByText(HOSTILE)).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('labels each proposal by source', () => {
    const ready = data()
    render(
      <GovernancePanel
        chainId="vna-testnet-1"
        model={withProposals(base, ready.proposals)}
        state={{ status: 'ready', data: ready }}
      />
    )
    const chain = screen.getByRole('button', { name: /Raise max validators/ })
    expect(within(chain).getByText(/chain #5/)).toBeInTheDocument()
    const group = screen.getByRole('button', { name: /Rotate keys/ })
    expect(within(group).getByText(/corporation #4/)).toBeInTheDocument()
  })

  it('lists corporations with their member count and total weight', () => {
    const ready = data()
    render(
      <GovernancePanel
        chainId="vna-testnet-1"
        model={withProposals(base, ready.proposals)}
        state={{ status: 'ready', data: ready }}
      />
    )
    expect(screen.getByText('2 members · weight 3')).toBeInTheDocument()
  })

  it('selects a proposal when its row is clicked', async () => {
    const ready = data()
    render(
      <GovernancePanel
        chainId="vna-testnet-1"
        model={withProposals(base, ready.proposals)}
        state={{ status: 'ready', data: ready }}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /Raise max validators/ }))
    expect(useObservatory.getState().selected).toBe('proposal:5')
  })

  it('says there are no proposals on the network instead of an empty list', () => {
    const empty = data({ proposals: [], constellations: [] })
    render(<GovernancePanel chainId="vna-devnet-1" model={base} state={{ status: 'ready', data: empty }} />)
    expect(screen.getByText('No proposals on vna-devnet-1')).toBeInTheDocument()
  })

  it('shows chain proposals as unavailable when the chain REST failed', () => {
    const ready = data({
      chain: { status: 'error', message: 'HTTP 502' },
      queries: { ...data().queries, govProposals: null },
    })
    render(
      <GovernancePanel
        chainId="vna-testnet-1"
        model={withProposals(base, ready.proposals)}
        state={{ status: 'ready', data: ready }}
      />
    )
    expect(screen.getByText('Chain proposals unavailable: HTTP 502')).toBeInTheDocument()
  })

  it('shows the error state when the governance data failed to load', () => {
    render(<GovernancePanel chainId="vna-testnet-1" model={base} state={{ status: 'error', message: 'HTTP 503' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Governance data unavailable: HTTP 503')
  })

  it('shows the query behind the proposal list', () => {
    const ready = data()
    render(
      <GovernancePanel
        chainId="vna-testnet-1"
        model={withProposals(base, ready.proposals)}
        state={{ status: 'ready', data: ready }}
      />
    )
    expect(screen.getAllByTestId('show-query').length).toBeGreaterThan(0)
  })
})
