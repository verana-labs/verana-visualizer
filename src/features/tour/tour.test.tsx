import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { useObservatory } from '@/store/observatory-store'
import { Tour } from './tour'
import { useTour } from './tour-store'

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn<(url: string) => void>() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: nav.replace }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(nav.search),
}))

const model = testnetModel()
const lastUrl = () => nav.replace.mock.calls.at(-1)?.[0] ?? ''

beforeEach(() => {
  nav.search = ''
  nav.replace.mockReset()
  window.history.replaceState(null, '', '/')
  useObservatory.setState({ model, lens: 'network', selected: null, trustCheck: null })
  useTour.setState({ step: null, presenting: false, note: null })
})

describe('Tour', () => {
  it('walks every step, driving the lens through setLens and the URL', async () => {
    render(<Tour ready chainName="testnet" />)
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
    render(<Tour ready chainName="testnet" />)
    expect(useTour.getState().step).toBe(4)
    expect(useObservatory.getState().lens).toBe('chain')
  })

  it('strips a stale tour= that another URL writer left behind after the tour ended', () => {
    nav.search = 'tour=2'
    const { rerender } = render(<Tour ready chainName="testnet" />)
    act(() => useTour.getState().exit())
    nav.replace.mockReset()
    nav.search = 'lens=trust&tour=2'
    rerender(<Tour ready chainName="testnet" />)
    expect(lastUrl()).toBe('/?lens=trust')
  })

  it('exits on Escape and on the close button', async () => {
    render(<Tour ready chainName="testnet" />)
    act(() => useTour.getState().start(3))
    await userEvent.keyboard('{Escape}')
    expect(useTour.getState().step).toBeNull()
    act(() => useTour.getState().start(1))
    await userEvent.click(screen.getByRole('button', { name: 'Exit tour' }))
    expect(useTour.getState().step).toBeNull()
  })
})
