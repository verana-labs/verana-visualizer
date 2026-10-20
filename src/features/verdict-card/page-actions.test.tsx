import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageActions } from './page-actions'

describe('PageActions', () => {
  it('copies the verdict link pinned to its block', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<PageActions path="/verdict/did%3Aweb%3Ax?block=44200" />)
    await user.click(screen.getByRole('button', { name: 'Copy verdict link' }))
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/verdict/did%3Aweb%3Ax?block=44200`)
  })
})
