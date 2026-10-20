import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { TimeScrubber, type TimeScrubberProps } from './time-scrubber'

const props = (over: Partial<TimeScrubberProps> = {}): TimeScrubberProps => ({
  head: 96135,
  height: 7070,
  density: [
    { height: 7051, count: 1 },
    { height: 7070, count: 2 },
  ],
  days: [{ date: '2026-10-14', height: 7051 }],
  historyStatus: 'success',
  historyError: null,
  snapshot: {
    status: 'ready',
    height: 7070,
    model: testnetModel(),
    time: '2026-10-14T10:02:08.784704521Z',
    query: { method: 'GET', url: 'https://idx.testnet.verana.network/v4/ecosystem/list', headers: {} },
    missing: 0,
  },
  playing: false,
  jumping: false,
  notice: null,
  onScrub: vi.fn(),
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onJump: vi.fn(),
  onLive: vi.fn(),
  ...over,
})

describe('TimeScrubber', () => {
  it('shows the block, its UTC date, the density strip and the controls', () => {
    const p = props()
    render(<TimeScrubber {...p} />)
    expect(screen.getByTestId('time-block')).toHaveTextContent('Block 7,070')
    expect(screen.getByTestId('time-date')).toHaveTextContent('14 Oct 2026')
    expect(screen.getByTestId('density-strip').querySelectorAll('rect')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Next event' }))
    expect(p.onJump).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(p.onPlay).toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Block height'), { target: { value: '38000' } })
    expect(p.onScrub).toHaveBeenCalledWith(38000)
  })

  it('counts participants like the indexer and the HUD, leaving terminated ones out', () => {
    render(<TimeScrubber {...props()} />)
    expect(screen.getByText(/157 participants/)).toBeInTheDocument()
  })

  it('shows a visible focus ring around the strip while the hidden range input has keyboard focus', () => {
    render(<TimeScrubber {...props()} />)
    const strip = screen.getByLabelText('Block height').parentElement as HTMLElement
    expect(strip.className).toMatch(/has-\[:focus-visible\]:ring-2/)
  })

  it('offers Pause while playing and disables Next event at the head', () => {
    render(<TimeScrubber {...props({ playing: true, height: 96135 })} />)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next event' })).toBeDisabled()
  })

  it('says the snapshot is unavailable instead of showing counts when it fails', () => {
    render(<TimeScrubber {...props({ snapshot: { status: 'error', height: 7070, message: 'GET … 503' } })} />)
    expect(screen.getByText(/Snapshot at block 7,070 unavailable/)).toBeInTheDocument()
  })

  it('says how many entities at the block are gone from the live chain', () => {
    const p = props()
    if (p.snapshot.status !== 'ready') throw new Error('fixture snapshot must be ready')
    render(<TimeScrubber {...p} snapshot={{ ...p.snapshot, missing: 3 }} />)
    expect(screen.getByRole('note')).toHaveTextContent(
      "3 entities existing at block 7,070 are no longer on chain and aren't drawn"
    )
  })
})
