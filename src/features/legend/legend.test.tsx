import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LENSES } from '@/layouts'
import { useObservatory } from '@/store/observatory-store'
import { Legend } from './legend'

describe('Legend', () => {
  it.each(LENSES)('shows only on lenses without a left panel (%s)', (lens) => {
    useObservatory.setState({ lens })
    render(<Legend />)
    const shown = lens === 'network' || lens === 'trust'
    expect(screen.queryByText('Ecosystem (trust root)') !== null).toBe(shown)
  })

  it('no longer carries the tour button, which lives in the HUD', () => {
    useObservatory.setState({ lens: 'network' })
    render(<Legend />)
    expect(screen.queryByRole('button', { name: /tour/ })).toBeNull()
  })

  it('folds behind a Legend toggle on phones', async () => {
    useObservatory.setState({ lens: 'network' })
    render(<Legend />)
    const toggle = screen.getByRole('button', { name: 'Legend' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const rows = screen.getByTestId('legend-rows')
    expect(rows.className).toMatch(/max-md:hidden/)
    await userEvent.setup().click(toggle)
    expect(rows.className).not.toMatch(/max-md:hidden/)
  })
})
