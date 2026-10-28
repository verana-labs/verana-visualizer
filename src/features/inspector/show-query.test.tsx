import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type QueryInfo, toCurl } from '@/lib/api/query-info'
import { ShowQuery } from './show-query'

const QUERY: QueryInfo = {
  method: 'POST',
  url: 'https://idx.testnet.verana.network/v4/verifiable-trust/resolve',
  headers: { 'content-type': 'application/json' },
  body: { did: "did:web:o'brien.example.org" },
}

describe('ShowQuery', () => {
  it('links the indexer or graph spec behind the request', () => {
    const { unmount } = render(<ShowQuery query={QUERY} />)
    expect(screen.getByRole('link', { name: 'indexer spec ↗' })).toHaveAttribute(
      'href',
      'https://github.com/verana-labs/verana-spec/blob/main/v4/verana-indexer/spec.md'
    )
    unmount()
    render(
      <ShowQuery
        query={{ method: 'POST', url: 'https://graph.testnet.verana.network/v4/graph/traverse', headers: {} }}
      />
    )
    expect(screen.getByRole('link', { name: 'graph spec ↗' })).toHaveAttribute(
      'href',
      'https://github.com/verana-labs/verana-spec/blob/main/v4/verana-graph/spec.md'
    )
  })

  it('renders the curl for the request', async () => {
    render(<ShowQuery query={QUERY} />)
    await userEvent.click(screen.getByRole('button', { name: /show the query/i }))
    expect(screen.getByTestId('curl')).toHaveTextContent(toCurl(QUERY), { normalizeWhitespace: false })
  })

  it('copies the curl to the clipboard', async () => {
    const user = userEvent.setup()
    render(<ShowQuery query={QUERY} />)
    await user.click(screen.getByRole('button', { name: /show the query/i }))
    await user.click(screen.getByRole('button', { name: /copy as curl/i }))
    expect(await navigator.clipboard.readText()).toBe(toCurl(QUERY))
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  describe('copy feedback timer', () => {
    afterEach(() => vi.useRealTimers())

    it('restarts on re-click and is cleared on unmount', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn(async () => undefined) },
      })
      const { unmount } = render(<ShowQuery query={QUERY} />)
      fireEvent.click(screen.getByRole('button', { name: /show the query/i }))
      const copyButton = screen.getByRole('button', { name: /copy as curl/i })
      await act(async () => fireEvent.click(copyButton))
      await act(async () => vi.advanceTimersByTime(1000))
      await act(async () => fireEvent.click(copyButton))
      await act(async () => vi.advanceTimersByTime(1000))
      expect(copyButton).toHaveTextContent('Copied')
      await act(async () => vi.advanceTimersByTime(700))
      expect(copyButton).toHaveTextContent('Copy as curl')
      await act(async () => fireEvent.click(copyButton))
      const clear = vi.spyOn(globalThis, 'clearTimeout')
      unmount()
      expect(clear).toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
