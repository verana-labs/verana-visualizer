import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { LensBar } from './lens-bar'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  useObservatory.setState({ lens: 'network' })
})

describe('LensBar', () => {
  it('scrolls sideways across the phone width instead of overflowing it', () => {
    render(<LensBar />)
    const bar = screen.getByRole('group', { name: 'Lenses' })
    expect(bar.className).toMatch(/max-md:inset-x-4/)
    expect(bar.className).toMatch(/max-xl:overflow-x-auto/)
  })

  it('scrolls the active lens into view on a phone-width bar', () => {
    const scrolled: string[] = []
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.textContent ?? '')
    }
    useObservatory.setState({ lens: 'registry' })
    render(<LensBar />)
    expect(scrolled).toEqual(['Registry'])
  })

  it('renders exactly the 7 lenses in order', () => {
    render(<LensBar />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Network',
      'Trust',
      'Economics',
      'Chain',
      'Time',
      'Governance',
      'Registry',
    ])
  })

  it('sets the lens, marks it pressed and writes it to the URL', () => {
    render(<LensBar />)
    expect(screen.getByRole('button', { name: 'Network' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Trust' }))
    expect(useObservatory.getState().lens).toBe('trust')
    expect(screen.getByRole('button', { name: 'Trust' })).toHaveAttribute('aria-pressed', 'true')
    expect(`${window.location.pathname}${window.location.search}`).toBe('/?lens=trust')
  })
})
