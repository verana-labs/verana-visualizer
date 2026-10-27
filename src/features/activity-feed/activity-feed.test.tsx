import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { testnetCfg } from '../../../tests/support/network'
import { testnetModel } from '../../../tests/support/recorded'
import { feedItemOf } from './activity'
import { ActivityFeed } from './activity-feed'

class SilentSocket {
  onopen = null
  onmessage = null
  onclose = null
  onerror = null
  send() {}
  close() {}
}

const cfg = testnetCfg
const model = testnetModel()

const item = (block: number, eventType = 'CreateNewCorporation', module = 'co') =>
  feedItemOf(
    {
      type: 'indexer-event',
      event_type: eventType,
      did: null,
      block_height: block,
      tx_hash: null,
      timestamp: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      payload: { module },
    },
    model
  )

beforeEach(() => {
  vi.stubGlobal('WebSocket', SilentSocket)
  useObservatory.setState({ model, blockHeight: 97_497, feed: [], cometLaunch: null, selected: null, trustCheck: null })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ActivityFeed', () => {
  it('lists each event with its human name, module chip, block and age', () => {
    useObservatory.setState({ feed: [item(44_201), item(44_200, 'GrantVSOperatorAuthorization', 'de')] })
    render(<ActivityFeed cfg={cfg} />)
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Create new corporation')).toBeInTheDocument()
    expect(within(rows[0]).getByText('co')).toBeInTheDocument()
    expect(within(rows[0]).getByText('block 44,201 · 3 days ago')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Grant VS operator authorization')).toBeInTheDocument()
  })

  it('renders a row without an age when the timestamp is unreadable', () => {
    useObservatory.setState({ feed: [{ ...item(44_201), timestamp: 'not-a-date' }] })
    render(<ActivityFeed cfg={cfg} />)
    expect(screen.getByText('block 44,201')).toBeInTheDocument()
  })

  it.each([
    'economics',
    'chain',
    'time',
    'governance',
    'registry',
  ] as const)('steps aside on phones for the %s lens panel', (lens) => {
    useObservatory.setState({ lens })
    render(<ActivityFeed cfg={cfg} />)
    expect(screen.getByRole('region', { name: 'Live activity' }).className).toMatch(/max-md:hidden/)
    useObservatory.setState({ lens: 'network' })
  })

  it('never shows a quiet-chain indicator', () => {
    render(<ActivityFeed cfg={cfg} />)
    expect(screen.queryByText(/last (tx|transaction)|quiet|no activity/i)).not.toBeInTheDocument()
  })

  it('replays real events and disables the button while running', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const events = Array.from({ length: 3 }, (_, i) => ({
      type: 'indexer-event',
      event_type: 'StartParticipantOP',
      did: null,
      block_height: 27_700 + i,
      tx_hash: null,
      timestamp: '2026-10-15T19:20:27Z',
      payload: { module: 'pp' },
    }))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        Response.json({ events: url.includes('after_block_height=27497') ? events : [] }, { status: 200 })
      )
    )
    render(<ActivityFeed cfg={cfg} />)
    const button = screen.getByRole('button', { name: 'Replay recent' })
    await act(async () => {
      fireEvent.click(button)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByText('Replaying events from block 27,700–27,702')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /replay recent/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel replay' })).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(450 * 3)
    })
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Replay recent' })).toBeEnabled()
  })

  it('says "No events found" when every window is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ events: [] }, { status: 200 }))
    )
    render(<ActivityFeed cfg={cfg} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Replay recent' }))
    })
    expect(await screen.findByText('No events found')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('collapses to its header row while the inspector or a trust check holds the right column', () => {
    useObservatory.setState({ feed: [item(44_201)] })
    render(<ActivityFeed cfg={cfg} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    act(() => useObservatory.setState({ selected: 'ecosystem:2' }))
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText('live activity')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replay recent' })).toBeInTheDocument()
    act(() => useObservatory.setState({ selected: null }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    act(() => useObservatory.getState().requestTrustCheck('did:web:x.example.org'))
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })
})
