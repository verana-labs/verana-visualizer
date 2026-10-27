import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CopyButton } from './copy-button'

describe('CopyButton', () => {
  it('announces the copy result politely', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<CopyButton label="Copy DID" text="did:web:a.example" />)
    expect(screen.getByRole('status')).toHaveTextContent('')
    await user.click(screen.getByRole('button', { name: 'Copy DID' }))
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
    expect(screen.getByRole('button')).toHaveTextContent('Copied')
  })
})
