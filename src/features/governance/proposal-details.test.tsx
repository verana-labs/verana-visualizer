import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fromGovProposal, fromGroupProposal, withProposals } from '@/domain/governance'
import { testnetModel } from '@/features/search/search-fixture'
import type { GroupProposal } from '@/lib/api/schemas'
import { ProposalDetails } from './proposal-details'

const groupProposals = JSON.parse(
  readFileSync(join(process.cwd(), 'tests/fixtures/testnet/group-proposals.json'), 'utf8')
) as GroupProposal[]

const query = { method: 'GET' as const, url: 'https://idx.testnet.verana.network/v4/group/proposals', headers: {} }
const votesQuery = {
  method: 'GET' as const,
  url: 'https://idx.testnet.verana.network/v4/group/votes?proposal_id=36',
  headers: {},
}

const group = fromGroupProposal({
  ...groupProposals[0],
  metadata: '{"title":"Rotate keys", "details": ',
  tally: { yes_count: '3', no_count: '1', abstain_count: '0', no_with_veto_count: '0' },
})
const model = withProposals(testnetModel(), [group])

describe('ProposalDetails', () => {
  it('shows the tally, status, voting window and proposer', () => {
    render(
      <ProposalDetails model={model} proposal={group} votes={{ status: 'idle' }} query={query} blockHeight={null} />
    )
    expect(screen.getByTestId('tally')).toHaveTextContent('Yes 3')
    expect(screen.getByTestId('tally')).toHaveTextContent('No 1')
    expect(screen.getByText('accepted')).toBeInTheDocument()
    expect(screen.getByText(/2026-10-16 21:36/)).toBeInTheDocument()
    expect(screen.getByText(/2026-10-21 21:36/)).toBeInTheDocument()
    expect(screen.getByText('verana1a7lnp2e3pscjxqah6nq6a5nynrzdj5rrztw30t')).toBeInTheDocument()
    expect(screen.getByTestId('show-query')).toBeInTheDocument()
  })

  it('renders metadata that is not valid JSON as raw text', () => {
    render(
      <ProposalDetails model={model} proposal={group} votes={{ status: 'idle' }} query={query} blockHeight={null} />
    )
    expect(screen.getByTestId('metadata')).toHaveTextContent('{"title":"Rotate keys", "details":')
  })

  it('links only http(s) URLs found in metadata', () => {
    const linked = fromGroupProposal({
      ...groupProposals[0],
      metadata: JSON.stringify({ title: 't', forum: 'https://forum.verana.io/t/1', bad: 'javascript:alert(1)' }),
    })
    render(
      <ProposalDetails
        model={withProposals(testnetModel(), [linked])}
        proposal={linked}
        votes={{ status: 'idle' }}
        query={query}
        blockHeight={null}
      />
    )
    const links = screen.getAllByRole('link').filter((a) => !a.textContent?.endsWith('spec ↗'))
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://forum.verana.io/t/1'])
    expect(links[0]).toHaveTextContent('forum')
    expect(links[0]).toHaveTextContent('forum.verana.io')
  })

  it('lists the votes once they are loaded, with the votes query', () => {
    render(
      <ProposalDetails
        model={model}
        proposal={group}
        votes={{
          status: 'ready',
          votes: [
            {
              id: 1,
              proposal_id: 36,
              voter: 'verana1voter',
              option: 'VOTE_OPTION_YES',
              submit_time: '2026-10-16T21:40:00Z',
            },
          ],
          query: votesQuery,
        }}
        query={query}
        blockHeight={null}
      />
    )
    expect(screen.getByText('verana1voter')).toBeInTheDocument()
    expect(screen.getByText('yes')).toBeInTheDocument()
    expect(screen.getAllByTestId('show-query')).toHaveLength(2)
  })

  it('shows votes as unavailable when the votes call failed, with a retry', async () => {
    const onRetryVotes = vi.fn()
    render(
      <ProposalDetails
        model={model}
        proposal={group}
        votes={{ status: 'error', message: 'HTTP 500' }}
        query={query}
        blockHeight={null}
        onRetryVotes={onRetryVotes}
      />
    )
    expect(screen.getByText('Votes unavailable: HTTP 500')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetryVotes).toHaveBeenCalledOnce()
  })

  it('renders decimal group weights exactly', () => {
    const decimal = fromGroupProposal({
      ...groupProposals[0],
      tally: { yes_count: '1.5', no_count: '0.25', abstain_count: '0', no_with_veto_count: '0' },
    })
    render(
      <ProposalDetails model={model} proposal={decimal} votes={{ status: 'idle' }} query={query} blockHeight={null} />
    )
    expect(screen.getByTestId('tally')).toHaveTextContent('Yes 1.5')
    expect(screen.getByTestId('tally')).toHaveTextContent('No 0.25')
  })

  it('says the tally is unavailable instead of throwing on malformed counts', () => {
    const broken = fromGroupProposal({
      ...groupProposals[0],
      tally: { yes_count: '1e+21', no_count: 'abc', abstain_count: '0', no_with_veto_count: '0' },
    })
    render(
      <ProposalDetails model={model} proposal={broken} votes={{ status: 'idle' }} query={query} blockHeight={null} />
    )
    expect(screen.getByText('Tally unavailable')).toBeInTheDocument()
    expect(screen.queryByTestId('tally')).toBeNull()
  })

  it('never shows zeros for an open chain proposal without a live tally', () => {
    const open = fromGovProposal({
      id: '11',
      status: 'PROPOSAL_STATUS_VOTING_PERIOD',
      title: 'Open',
      summary: null,
      final_tally_result: { yes_count: '0', no_count: '0', abstain_count: '0', no_with_veto_count: '0' },
    })
    render(
      <ProposalDetails
        model={withProposals(testnetModel(), [open])}
        proposal={open}
        votes={{ status: 'idle' }}
        query={query}
        blockHeight={null}
      />
    )
    expect(screen.getByText('Tally available after voting')).toBeInTheDocument()
    expect(screen.queryByText(/Yes 0/)).toBeNull()
  })

  it('labels a live tally as live', () => {
    const live = {
      ...fromGovProposal({ id: '12', status: 'PROPOSAL_STATUS_VOTING_PERIOD', title: 'Open', summary: null }),
      tally: { status: 'ready' as const, live: true, tally: { yes: '7', no: '1', abstain: '0', veto: '0' } },
    }
    render(
      <ProposalDetails
        model={withProposals(testnetModel(), [live])}
        proposal={live}
        votes={{ status: 'idle' }}
        query={query}
        blockHeight={null}
      />
    )
    expect(screen.getByText('live tally')).toBeInTheDocument()
    expect(screen.getByTestId('tally')).toHaveTextContent('Yes 7')
  })

  it('drops binary links that are not http(s)', () => {
    const chain = fromGovProposal({
      id: '10',
      status: 'PROPOSAL_STATUS_PASSED',
      title: 'Upgrade',
      summary: null,
      messages: [
        {
          '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
          plan: {
            name: 'v1',
            height: '5',
            info: JSON.stringify({
              binaries: { 'linux/amd64': 'javascript:alert(1)', 'darwin/arm64': 'data:text/html,hi' },
            }),
          },
        },
      ],
    })
    render(
      <ProposalDetails
        model={withProposals(testnetModel(), [chain])}
        proposal={chain}
        votes={{ status: 'idle' }}
        query={query}
        blockHeight={null}
      />
    )
    expect(screen.queryAllByRole('link').filter((a) => !a.textContent?.endsWith('spec ↗'))).toEqual([])
  })

  it('shows the upgrade plan of a chain software upgrade proposal', () => {
    const chain = fromGovProposal({
      id: '9',
      status: 'PROPOSAL_STATUS_PASSED',
      title: 'Upgrade',
      summary: '<b>bold</b>',
      messages: [
        {
          '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
          authority: 'verana1gov',
          plan: {
            name: 'v0.9',
            height: '500',
            info: JSON.stringify({
              binaries: {
                'linux/amd64': 'https://github.com/verana-labs/verana/releases/download/v0.9/veranad-linux-amd64',
              },
            }),
          },
        },
      ],
      final_tally_result: { yes_count: '10', no_count: '0', abstain_count: '0', no_with_veto_count: '0' },
    })
    const { container } = render(
      <ProposalDetails
        model={withProposals(testnetModel(), [chain])}
        proposal={chain}
        votes={{ status: 'idle' }}
        query={query}
        blockHeight={800}
      />
    )
    expect(screen.getByText('Software upgrade')).toBeInTheDocument()
    expect(screen.getByText('v0.9')).toBeInTheDocument()
    expect(screen.getByText('Reached target height 500')).toBeInTheDocument()
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument()
    expect(container.querySelector('b b')).toBeNull()
    expect(screen.getByRole('link', { name: /linux\/amd64/ })).toHaveAttribute(
      'href',
      'https://github.com/verana-labs/verana/releases/download/v0.9/veranad-linux-amd64'
    )
  })

  it('links the raw on-chain binary URL and labels a corrected file name separately', () => {
    const onChain = 'https://github.com/verana-labs/verana/releases/download/v0.9/veranad-v0.9-linux-amd64'
    const chain = fromGovProposal({
      id: '10',
      status: 'PROPOSAL_STATUS_PASSED',
      title: 'Upgrade',
      summary: '',
      messages: [
        {
          '@type': '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade',
          authority: 'verana1gov',
          plan: { name: 'v0.9', height: '500', info: JSON.stringify({ binaries: { 'linux/amd64': onChain } }) },
        },
      ],
      final_tally_result: { yes_count: '10', no_count: '0', abstain_count: '0', no_with_veto_count: '0' },
    })
    render(
      <ProposalDetails
        model={withProposals(testnetModel(), [chain])}
        proposal={chain}
        votes={{ status: 'idle' }}
        query={query}
        blockHeight={800}
      />
    )
    expect(screen.getByRole('link', { name: 'linux/amd64 (on chain) ↗' })).toHaveAttribute('href', onChain)
    expect(screen.getByRole('link', { name: 'linux/amd64 (corrected file name) ↗' })).toHaveAttribute(
      'href',
      'https://github.com/verana-labs/verana/releases/download/v0.9/veranad-linux-amd64'
    )
  })
})
