import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildNetworkModel } from '@/domain/network-model'
import { recordedNetwork } from '../../../tests/support/recorded'
import type { RegistryData } from './load-registry'
import { RegistryPanel } from './registry-panel'

const model = buildNetworkModel(recordedNetwork('devnet'))

const NOW = new Date('2026-10-20T12:00:00Z')
const pendingQuery = {
  method: 'GET' as const,
  url: 'https://idx.devnet.verana.network/v4/participant/pending/flat?corporation_id=2',
  headers: {},
}
const pendingQuery2 = { ...pendingQuery, url: pendingQuery.url.replace('corporation_id=2', 'corporation_id=5') }
const statsQuery = { method: 'GET' as const, url: 'https://idx.devnet.verana.network/v4/stats/stats', headers: {} }

const ready = (pending: RegistryData['pending']): RegistryData => ({
  pending,
  slashes: { status: 'ready', queries: [statsQuery], data: { since: '2026-10-01', events: [] } },
})

const tasks = [
  { participantId: 46, role: 'HOLDER', ecosystemId: 1, schemaId: 1, validatorCorporationId: 2 },
  { participantId: 32, role: 'HOLDER', ecosystemId: 1, schemaId: 1, validatorCorporationId: 2 },
]

describe('RegistryPanel', () => {
  it('shows one onboarding column per op_state with its count', () => {
    render(
      <RegistryPanel
        model={model}
        now={NOW}
        state={{
          status: 'ready',
          data: ready({ status: 'ready', data: tasks, queries: [pendingQuery, pendingQuery2] }),
        }}
      />
    )
    const columns = screen.getByRole('list', { name: 'Onboarding states' })
    const items = within(columns).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual(['PENDING2', 'VALIDATED46', 'TERMINATED0'])
  })

  it('lists each pending task with the corporation that must act', () => {
    render(
      <RegistryPanel
        model={model}
        now={NOW}
        state={{
          status: 'ready',
          data: ready({ status: 'ready', data: tasks, queries: [pendingQuery, pendingQuery2] }),
        }}
      />
    )
    const list = screen.getByRole('list', { name: 'Pending tasks' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('#46')
    expect(rows[0]).toHaveTextContent('Holder')
    expect(rows[0]).toHaveTextContent('awaiting corporation #2')
  })

  it('shows the query behind every pending/flat request', () => {
    render(
      <RegistryPanel
        model={model}
        now={NOW}
        state={{
          status: 'ready',
          data: ready({ status: 'ready', data: tasks, queries: [pendingQuery, pendingQuery2] }),
        }}
      />
    )
    expect(screen.getByText(pendingQuery.url)).toBeInTheDocument()
    expect(screen.getByText(pendingQuery2.url)).toBeInTheDocument()
  })

  it('keeps the participant counts when pending/flat is unavailable', () => {
    render(
      <RegistryPanel
        model={model}
        now={NOW}
        state={{
          status: 'ready',
          data: ready({ status: 'error', message: 'GET pending/flat failed with status 503' }),
        }}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Pending tasks unavailable: GET pending/flat failed')
    const items = within(screen.getByRole('list', { name: 'Onboarding states' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('PENDING2')
  })

  it('shows the watch list with the 30-day empty state and no calendar', () => {
    render(
      <RegistryPanel
        model={model}
        now={NOW}
        state={{ status: 'ready', data: ready({ status: 'ready', data: [], queries: [] }) }}
      />
    )
    expect(screen.getByRole('region', { name: 'Watch list' })).toBeInTheDocument()
    expect(screen.getByText('No accreditation expires in the next 30 days')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).toBeNull()
  })

  it('says it is reading while the registry data loads', () => {
    render(<RegistryPanel model={model} now={NOW} state={{ status: 'loading' }} />)
    expect(screen.getByText(/Reading pending tasks and slash history/)).toBeInTheDocument()
  })
})
