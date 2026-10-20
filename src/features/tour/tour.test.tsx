import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { useTimeStore } from '@/features/time-scrubber/time-store'
import { testnetCfg } from '@/features/trust-check/trust-fixture'
import { useObservatory } from '@/store/observatory-store'
import { Tour } from './tour'
import { useTour } from './tour-store'

const nav = vi.hoisted(() => {
  const replace = vi.fn<(url: string) => void>()
  return { search: '', replace, router: { replace } }
})
vi.mock('next/navigation', () => ({
  useRouter: () => nav.router,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const history = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/indexer', () => ({ createIndexerClient: () => ({ entityHistory: history }) }))

const model = testnetModel()
const lastUrl = () => `${window.location.pathname}${window.location.search}`

beforeEach(() => {
  nav.search = ''
  nav.replace.mockReset()
  window.history.replaceState(null, '', '/')
  useObservatory.setState({ model, lens: 'network', selected: null, trustCheck: null })
  useTour.setState({ step: null, presenting: false, note: null })
  useTimeStore.getState().reset()
  history.mockReset().mockResolvedValue({ data: [] })
})

describe('Tour', () => {
  it('walks every step, driving the lens through setLens and the URL', async () => {
    render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().start())
    expect(screen.getByText(/This is the Verana testnet, live/)).toBeInTheDocument()
    expect(lastUrl()).toBe('/?tour=0')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(useObservatory.getState().selected).toMatch(/^ecosystem:/)
    expect(lastUrl()).toMatch(/sel=ecosystem%3A|sel=ecosystem:/)

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(useObservatory.getState().lens).toBe('trust')
    expect(lastUrl()).toMatch(/^\/\?lens=trust&sel=ecosystem:\d+&tour=2$/)

    for (let i = 3; i <= 8; i++) await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(useObservatory.getState().lens).toBe('network')
    expect(useObservatory.getState().trustCheck?.did).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/Nothing on this screen is simulated/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(useTour.getState().step).toBeNull()
    expect(lastUrl()).toBe('/')
  })

  it('restores the step from tour= in the URL', () => {
    nav.search = 'tour=4'
    render(<Tour ready cfg={testnetCfg} />)
    expect(useTour.getState().step).toBe(4)
    expect(useObservatory.getState().lens).toBe('chain')
  })

  it('strips a stale tour= that another URL writer left behind after the tour ended', () => {
    nav.search = 'tour=2'
    const { rerender } = render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().exit())
    nav.search = 'lens=trust&tour=2'
    window.history.replaceState(null, '', '/?lens=trust&tour=2')
    rerender(<Tour ready cfg={testnetCfg} />)
    expect(lastUrl()).toBe('/?lens=trust')
  })

  it('exits on Escape and on the close button', async () => {
    render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().start(3))
    await userEvent.keyboard('{Escape}')
    expect(useTour.getState().step).toBeNull()
    act(() => useTour.getState().start(1))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
    expect(useTour.getState().step).toBeNull()
  })

  it('keeps the step and the user selection when the model object is swapped for the same raw data', () => {
    render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().start(6))
    const picked = model.ecosystems[model.ecosystems.length - 1].id
    act(() => useObservatory.getState().select(picked))
    const before = lastUrl()
    act(() => useObservatory.setState({ model: { ...model, entities: new Map(model.entities) } }))
    expect(useObservatory.getState().selected).toBe(picked)
    expect(lastUrl()).toBe(before)
  })

  it('opens the time scrubber at the block where the first ecosystem was created', async () => {
    const first = [...model.raw.ecosystems].sort((a, b) => Date.parse(a.created) - Date.parse(b.created))[0]
    history.mockResolvedValue({
      data: [
        {
          id: 2,
          block_height: '7300',
          timestamp: '',
          entity_type: 'Ecosystem',
          entity_id: first.id,
          msg: 'Update',
          changes: {},
        },
        {
          id: 1,
          block_height: '7060',
          timestamp: '',
          entity_type: 'Ecosystem',
          entity_id: first.id,
          msg: 'Create',
          changes: {},
        },
      ],
    })
    render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().start(5))
    await waitFor(() => expect(useTimeStore.getState().height).toBe(7060))
    expect(history).toHaveBeenCalledWith('ecosystem', first.id)
    expect(useTour.getState().note).toBe(
      `Block 7,060: ${model.entities.get(`ecosystem:${first.id}`)?.name} was created, the first ecosystem on testnet.`
    )
  })

  it('stays at the live height and says so when the history call fails', async () => {
    history.mockRejectedValue(new Error('HTTP 503'))
    render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().start(5))
    await waitFor(() => expect(useTour.getState().note).toBe('The first ecosystem’s block is unavailable: HTTP 503'))
    expect(useTimeStore.getState().height).toBeNull()
  })

  it('moves the caption above the scene on the time step so it never covers the scrubber', () => {
    render(<Tour ready cfg={testnetCfg} />)
    act(() => useTour.getState().start(4))
    expect(screen.getByRole('dialog', { name: 'Guided tour' }).className).toMatch(/bottom-\[80px\]/)
    act(() => useTour.getState().go(5))
    expect(screen.getByRole('dialog', { name: 'Guided tour' }).className).toMatch(/top-\[120px\]/)
  })
})
