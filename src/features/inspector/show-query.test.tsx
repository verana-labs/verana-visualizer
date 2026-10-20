import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { type QueryInfo, toCurl } from '@/lib/api/query-info'
import { ShowQuery } from './show-query'

const QUERY: QueryInfo = {
  method: 'POST',
  url: 'https://idx.testnet.verana.network/v4/verifiable-trust/resolve',
  headers: { 'content-type': 'application/json' },
  body: { did: "did:web:o'brien.example.org" },
}

describe('ShowQuery', () => {
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
})
