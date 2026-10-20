import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { LensBar } from './lens-bar'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

beforeEach(() => {
  replace.mockClear()
  useObservatory.setState({ lens: 'network' })
})

describe('LensBar', () => {
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
    expect(replace).toHaveBeenCalledWith('/?lens=trust', { scroll: false })
  })
})
