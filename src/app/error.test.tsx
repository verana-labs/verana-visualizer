import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import AppError from './error'

afterEach(() => vi.restoreAllMocks())

describe('app error page', () => {
  it('names the failure, logs it and retries on demand', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    const reset = vi.fn()
    render(<AppError error={new Error('indexer exploded')} reset={reset} />)
    expect(screen.getByRole('alert')).toHaveTextContent('indexer exploded')
    expect(error).toHaveBeenCalledWith('The observatory crashed', expect.any(Error))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
