import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { resolveNetworkConfig } from '@/lib/env'
import { Footer } from './footer'

const cfg = resolveNetworkConfig({
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
})

describe('Footer', () => {
  it('renders the 8 links with exact hrefs, opening in a new tab', () => {
    render(<Footer cfg={cfg} />)
    const expected: Record<string, string> = {
      Documentation: 'https://docs.verana.io',
      'Verana app': 'https://app.testnet.verana.network',
      'Verana Graph': 'https://graph.testnet.verana.network/explorer',
      'Indexer API': 'https://idx.testnet.verana.network',
      LinkedIn: 'https://www.linkedin.com/company/verana-verifiable-trust-network',
      X: 'https://x.com/Verana_io',
      Discord: 'https://discord.gg/edjaFn252q',
      GitHub: 'https://github.com/verana-labs',
    }
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(8)
    for (const [name, href] of Object.entries(expected)) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noreferrer')
    }
  })

  it('keeps only the icons on phones so it never wraps', () => {
    render(<Footer cfg={cfg} />)
    expect(screen.getByRole('navigation', { name: 'Verana links' }).className).toMatch(/max-md:hidden/)
    expect(screen.getByText('Verana Visualizer').className).toMatch(/max-md:hidden/)
  })
})
