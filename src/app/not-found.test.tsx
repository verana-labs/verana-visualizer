import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import NotFound from './not-found'

describe('app not-found page', () => {
  it('says the page is missing and links back to the observatory', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading')).toHaveTextContent('This page is not in the observatory')
    expect(screen.getByRole('link', { name: 'Back to the observatory' })).toHaveAttribute('href', '/')
  })
})
