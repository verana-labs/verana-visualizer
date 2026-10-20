import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hud } from '@/features/hud/hud'
import { Inspector } from '@/features/inspector/inspector'
import { testnetModel } from '@/features/search/search-fixture'
import { SearchPalette } from '@/features/search/search-palette'
import { useObservatory } from '@/store/observatory-store'
import { PAPAPO_DID, testnetCfg, UNKNOWN_DID } from './trust-fixture'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const PAPAPO_AGENT = `agent:${PAPAPO_DID}` as const

beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverStub
  Element.prototype.scrollIntoView = () => {}
  useObservatory.setState({
    model: testnetModel(),
    selected: null,
    palette: 'closed',
    trustCheck: null,
    agentVerdicts: new Map(),
  })
})

describe('the trust check entry points', () => {
  it('opens the palette in check mode from the HUD hero button', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Hud cfg={testnetCfg} />
        <SearchPalette />
      </>
    )
    await user.click(screen.getByRole('button', { name: 'Is this service trustworthy?' }))
    expect(useObservatory.getState().palette).toBe('check')
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', expect.stringMatching(/paste a DID/i))
  })

  it('checks a pasted DID even when it is not in the loaded network', async () => {
    const user = userEvent.setup()
    useObservatory.getState().openPalette('check')
    render(<SearchPalette />)
    await user.click(screen.getByRole('combobox'))
    await user.paste(UNKNOWN_DID)
    await user.keyboard('{Enter}')
    const check = useObservatory.getState().trustCheck
    expect(check).toMatchObject({ did: UNKNOWN_DID, subject: null, result: null })
    expect(useObservatory.getState().palette).toBe('closed')
  })

  it('checks a service picked by name and selects it', async () => {
    const user = userEvent.setup()
    useObservatory.getState().openPalette('check')
    render(<SearchPalette />)
    await user.type(screen.getByRole('combobox'), 'QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv')
    const options = within(screen.getByRole('listbox')).getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent(/papapo/i)
    await user.keyboard('{Enter}')
    expect(useObservatory.getState().trustCheck).toMatchObject({ did: PAPAPO_DID, subject: PAPAPO_AGENT })
    expect(useObservatory.getState().selected).toBe(PAPAPO_AGENT)
  })

  it('offers a trust check action in normal search when the query is a DID', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.keyboard('/')
    await user.click(screen.getByRole('combobox'))
    await user.paste(PAPAPO_DID)
    await user.click(screen.getByRole('option', { name: /is this service trustworthy/i }))
    expect(useObservatory.getState().trustCheck).toMatchObject({ did: PAPAPO_DID })
  })

  it('runs a trust check from the agent inspector panel', async () => {
    const user = userEvent.setup()
    useObservatory.setState({ selected: PAPAPO_AGENT })
    render(<Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />)
    await user.click(screen.getByRole('button', { name: 'Check trust' }))
    expect(useObservatory.getState().trustCheck).toMatchObject({ did: PAPAPO_DID, subject: PAPAPO_AGENT })
    expect(screen.getByRole('dialog', { name: /trust check/i })).toBeInTheDocument()
  })

  it('clears the trust check on Escape, keeping the selected service', async () => {
    const user = userEvent.setup()
    act(() => useObservatory.getState().requestTrustCheck(PAPAPO_DID))
    render(<Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />)
    expect(screen.getByRole('dialog', { name: /trust check/i })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(useObservatory.getState().trustCheck).toBeNull()
    expect(useObservatory.getState().selected).toBe(PAPAPO_AGENT)
  })

  it('clears the trust check when another entity is selected', () => {
    useObservatory.getState().requestTrustCheck(PAPAPO_DID)
    useObservatory.getState().select('ecosystem:2')
    expect(useObservatory.getState().trustCheck).toBeNull()
  })
})
