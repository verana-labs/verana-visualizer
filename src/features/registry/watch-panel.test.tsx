import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Participant } from '@/lib/api/schemas'
import { testnetModel } from '../../../tests/support/recorded'
import { WatchPanel } from './watch-panel'

const model = testnetModel()
const NOW = new Date('2026-10-20T12:00:00Z')
const [first, second] = model.raw.participants
const query = { method: 'GET' as const, url: 'https://idx.testnet.verana.network/v4/stats/stats', headers: {} }

const expiring: Participant[] = [
  { ...second, effective_until: '2026-10-25T00:00:00Z' },
  { ...first, effective_until: '2026-11-15T00:00:00Z' },
]

describe('WatchPanel', () => {
  it('frames slashes and expirations as a watch list', () => {
    render(
      <WatchPanel
        model={model}
        now={NOW}
        expiring={expiring}
        slashes={{
          status: 'ready',
          queries: [query],
          data: {
            since: '2026-10-15',
            events: [{ day: '2026-10-18', ecosystemEvents: 1, networkEvents: 0, amount: 500 }],
          },
        }}
      />
    )
    const panel = screen.getByRole('region', { name: 'Watch list' })
    const slashes = within(panel).getByRole('list', { name: 'Slash events' })
    expect(within(slashes).getByText(/2026-10-18/)).toBeInTheDocument()
    expect(within(slashes).getByText(/1 ecosystem slash/)).toBeInTheDocument()
    const items = within(within(panel).getByRole('list', { name: 'Upcoming expirations' })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent(`#${second.id}`)
    expect(items[0]).toHaveTextContent('in 5 days')
    expect(items[1]).toHaveTextContent(`#${first.id}`)
  })

  it('says so plainly when nothing expires and nothing was slashed, with no calendar grid', () => {
    render(
      <WatchPanel
        model={model}
        now={NOW}
        expiring={[]}
        slashes={{ status: 'ready', queries: [query], data: { since: '2026-10-15', events: [] } }}
      />
    )
    expect(screen.getByText('No accreditation expires in the next 30 days')).toBeInTheDocument()
    expect(screen.getByText('No slashes recorded since 2026-10-15')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('marks only the slash section unavailable when stats fail', () => {
    render(
      <WatchPanel
        model={model}
        now={NOW}
        expiring={expiring}
        slashes={{ status: 'error', message: 'GET /v4/stats/stats failed with status 500' }}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Slash history unavailable: GET /v4/stats/stats failed')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
