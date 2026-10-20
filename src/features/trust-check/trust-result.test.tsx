import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrustCheck } from '@/domain/trust-check'
import { testnetModel } from '@/features/search/search-fixture'
import { createGraphClient } from '@/lib/api/graph'
import { createIndexerClient } from '@/lib/api/indexer'
import { logger } from '@/lib/logger'
import { useObservatory } from '@/store/observatory-store'
import { runTrustCheck } from './run-trust-check'
import { ECS_DID, PAPAPO_DID, stubTrustNetwork, testnetCfg, UNKNOWN_DID } from './trust-fixture'
import { TrustResult } from './trust-result'

const model = testnetModel()
const NOW = new Date('2026-10-20T12:00:00Z')

async function checked(did: string, options: Parameters<typeof stubTrustNetwork>[0] = {}): Promise<TrustCheck> {
  stubTrustNetwork(options)
  const check = await runTrustCheck(
    did,
    model,
    { indexer: createIndexerClient(testnetCfg), graph: createGraphClient(testnetCfg) },
    NOW
  )
  vi.unstubAllGlobals()
  return check
}

function showResult(check: TrustCheck | null, did = PAPAPO_DID) {
  act(() => {
    useObservatory.getState().requestTrustCheck(did)
    const seq = useObservatory.getState().trustCheck?.seq ?? -1
    if (check) useObservatory.getState().finishTrustCheck(seq, check)
  })
  return render(<TrustResult />)
}

beforeEach(() => {
  vi.spyOn(logger, 'error').mockImplementation(() => {})
  useObservatory.setState({ model, selected: null, trustCheck: null, agentVerdicts: new Map() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('TrustResult', () => {
  it('shows the indexer verdict, block, time and the linear chain with hop states', async () => {
    const { container } = showResult(await checked(PAPAPO_DID))
    expect(screen.getByTestId('trust-verdict')).toHaveTextContent('Not trusted')
    expect(screen.getByText('44,200')).toBeInTheDocument()
    expect(screen.getByText(/2026-10-16 21:46:17 UTC/)).toBeInTheDocument()
    const rows = screen.getAllByTestId('chain-hop')
    expect(rows.map((row) => row.getAttribute('data-id'))).toEqual([
      `agent:${PAPAPO_DID}`,
      'participant:158',
      'participant:5',
      'ecosystem:2',
    ])
    expect(rows[1]).toHaveTextContent('State: ACTIVE · Onboarding: VALIDATED')
    expect(screen.getByText('Path from verana-graph G1')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\bpass\b|\bfail|✓|✗/i)
  })

  it('shows a failed resolve as an error and never as trusted', async () => {
    const { container } = showResult(await checked(PAPAPO_DID, { resolveStatus: 500 }))
    expect(screen.getByTestId('trust-verdict')).toHaveTextContent(/^Could not resolve: HTTP 500 /)
    expect(container.textContent).not.toMatch(/Trusted/)
  })

  it('says which participant is drawn when several share the DID', async () => {
    showResult(await checked(ECS_DID), ECS_DID)
    expect(screen.getByText('8 participants share this DID · showing participant:11')).toBeInTheDocument()
  })

  it('shows a pending check as resolving', () => {
    showResult(null)
    expect(screen.getByTestId('trust-verdict')).toHaveTextContent('Resolving…')
  })

  it('says when the DID is outside the loaded network', async () => {
    showResult(await checked(UNKNOWN_DID), UNKNOWN_DID)
    expect(screen.getByText(/not in the loaded network/i)).toBeInTheDocument()
    expect(screen.queryAllByTestId('chain-hop')).toHaveLength(0)
  })

  it('copies the citable verdict URL and the chain', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    showResult(await checked(PAPAPO_DID))
    await user.click(screen.getByRole('button', { name: 'Copy verdict link' }))
    expect(writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/verdict/${encodeURIComponent(PAPAPO_DID)}?block=44200`
    )
    await user.click(screen.getByRole('button', { name: 'Copy chain' }))
    expect(writeText).toHaveBeenLastCalledWith(
      [`agent:${PAPAPO_DID}`, 'participant:158', 'participant:5', 'ecosystem:2'].join('\n')
    )
  })

  it('records a definite verdict on the agent so it recolours', async () => {
    showResult(await checked(PAPAPO_DID))
    expect(useObservatory.getState().agentVerdicts.get(`agent:${PAPAPO_DID}`)).toBe(false)
  })
})
