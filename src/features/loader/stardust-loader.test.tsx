import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FetchError } from '@/lib/fetch-json'
import { StardustLoader } from './stardust-loader'

const error = new FetchError('GET https://idx.invalid failed: nope', {
  url: 'https://idx.invalid',
  status: null,
  body: null,
})

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('StardustLoader', () => {
  it('shows the Verana logo and the counter while loading', () => {
    render(<StardustLoader progress={3 / 7} label="Reading schemas…" error={null} done={false} onExited={() => {}} />)
    const logo = screen.getByRole('img', { name: 'Verana' })
    expect(logo).toHaveAttribute('src', '/logo.svg')
    expect(logo).toHaveClass('sr-only')
    expect(screen.getByText('Reading schemas…')).toBeInTheDocument()
    expect(screen.getByText('043')).toBeInTheDocument()
  })

  it('keeps the logo in the error state and shows the message with a retry button', async () => {
    const onRetry = vi.fn()
    render(
      <StardustLoader
        progress={0.2}
        label="Reading schemas…"
        error={error}
        done={false}
        onExited={() => {}}
        onRetry={onRetry}
      />
    )
    const logo = screen.getByRole('img', { name: 'Verana' })
    expect(logo).toHaveAttribute('src', '/logo.svg')
    expect(logo).toHaveClass('sr-only')
    expect(screen.getByRole('alert')).toHaveTextContent(`Could not read the network: ${error.message}`)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('calls onExited after the exit animation, quickly under reduced motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const onExited = vi.fn()
    render(<StardustLoader progress={1} label="Ready" error={null} done onExited={onExited} />)
    await waitFor(() => expect(onExited).toHaveBeenCalledTimes(1), { timeout: 1000 })
  })

  it('does not call onExited before done', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query }))
    const onExited = vi.fn()
    render(<StardustLoader progress={0.5} label="x" error={null} done={false} onExited={onExited} />)
    await new Promise((r) => setTimeout(r, 450))
    expect(onExited).not.toHaveBeenCalled()
  })
})
