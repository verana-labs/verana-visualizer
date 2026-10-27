import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fromGovProposal, withProposals } from '@/domain/governance'
import { Inspector } from '@/features/inspector/inspector'
import { logger } from '@/lib/logger'
import { useObservatory } from '@/store/observatory-store'
import { PAPAPO_DID, testnetCfg } from '../../../tests/support/network'
import { testnetModel } from '../../../tests/support/recorded'
import { SearchPalette } from './search-palette'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

interface SearchBody {
  surface: string
  freeText: string
  includeUntrusted?: boolean
}

const GRAPH_HITS: Record<string, { type: string; id: string | number }[]> = {
  CredentialSchema: [{ type: 'CredentialSchema', id: 9 }],
  Did: [{ type: 'Did', id: PAPAPO_DID }],
}

function stubGraphSearch(hits: typeof GRAPH_HITS = {}) {
  const fetchMock = vi.fn(async (_input: string, init?: RequestInit) => {
    const { surface } = JSON.parse(String(init?.body)) as SearchBody
    const found = hits[surface] ?? []
    return Response.json({ totalCount: found.length, hits: found, nextCursor: null })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverStub
  Element.prototype.scrollIntoView = () => {}
  useObservatory.setState({ model: testnetModel(), selected: null, palette: 'closed' })
  stubGraphSearch()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('SearchPalette', () => {
  it('opens prefilled with a query handed over by a legacy link', () => {
    render(<SearchPalette cfg={testnetCfg} />)
    act(() =>
      useObservatory
        .getState()
        .openPalette('search', 'verana1yp38kfyr2wmccyqryqggpmpmq09ur9wy48ksqw6x824n4la83jrstlhfcj')
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('combobox')).toHaveValue(
      'verana1yp38kfyr2wmccyqryqggpmpmq09ur9wy48ksqw6x824n4la83jrstlhfcj'
    )
    expect(within(dialog).getAllByRole('option')[0]).toHaveTextContent('Corporation #34')
  })

  it('opens with / and with Cmd+K and Ctrl+K', async () => {
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.keyboard('/')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.keyboard('{Control>}k{/Control}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('hands focus back to the search trigger when it closes', async () => {
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    const trigger = screen.getByRole('button', { name: /search the network/i })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
  })

  it('does not open on / while typing in an input', async () => {
    const user = userEvent.setup()
    render(
      <>
        <input aria-label="other" />
        <SearchPalette cfg={testnetCfg} />
      </>
    )
    await user.click(screen.getByLabelText('other'))
    await user.keyboard('/')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens from the trigger button', async () => {
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lists ECS first under the ecosystem group', async () => {
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'ecs')
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('ECS')
    const groups = screen.getAllByTestId('search-group').map((g) => g.getAttribute('data-kind'))
    expect(groups[0]).toBe('ecosystem')
  })

  it('lists proposals under their own group once the governance lens loaded them', async () => {
    const proposal = fromGovProposal({ id: '4', status: 'PROPOSAL_STATUS_PASSED', title: 'Rotate keys', summary: null })
    useObservatory.setState({ model: withProposals(testnetModel(), [proposal]) })
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'rotate')
    const group = screen.getByTestId('search-group')
    expect(group).toHaveAttribute('data-kind', 'proposal')
    expect(group).toHaveTextContent('Proposals')
    expect(within(group).getByRole('option')).toHaveTextContent('Rotate keys')
  })

  it('adds Graph faceted-search hits that the loaded names do not match', async () => {
    const fetchMock = stubGraphSearch(GRAPH_HITS)
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'workshop')
    const schemas = await screen.findByText('AuthorizedRepairerCredential')
    expect(schemas.closest('[data-kind]')).toHaveAttribute('data-kind', 'schema')
    expect(screen.getAllByTestId('search-group').map((g) => g.getAttribute('data-kind'))).toEqual(['agent', 'schema'])
    const bodies = fetchMock.mock.calls.map(([url, init]) => ({ url, body: JSON.parse(String(init?.body)) }))
    expect(bodies.every(({ url }) => url === `${testnetCfg.graphUrl}/v4/graph/search`)).toBe(true)
    expect(bodies.map(({ body }) => body.surface).sort()).toEqual([
      'Corporation',
      'CredentialSchema',
      'Did',
      'Ecosystem',
    ])
    expect(bodies.find(({ body }) => body.surface === 'Did')?.body).toMatchObject({
      freeText: 'workshop',
      includeUntrusted: true,
    })
  })

  it('resolves a pasted DID or account locally without a Graph free-text search', async () => {
    const fetchMock = stubGraphSearch(GRAPH_HITS)
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.click(screen.getByRole('combobox'))
    await user.paste(PAPAPO_DID)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screen.getByRole('option', { name: /is this service trustworthy/i })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks the Graph only for services in check mode', async () => {
    const fetchMock = stubGraphSearch(GRAPH_HITS)
    render(<SearchPalette cfg={testnetCfg} />)
    act(() => useObservatory.getState().openPalette('check', 'workshop'))
    const [service] = await screen.findAllByRole('option')
    expect(service).toHaveTextContent(/papapo/i)
    expect(screen.queryByText('AuthorizedRepairerCredential')).toBeNull()
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).surface)).toEqual(['Did'])
  })

  it('says so when the Graph search fails and keeps the local matches', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ error: { code: 'INTERNAL', message: 'down' } }, { status: 500 }))
    )
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'ecs')
    expect(await screen.findByRole('alert')).toHaveTextContent(/graph search failed/i)
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('ECS')
  })

  it('never lets a slower reply to an earlier query replace the hits of the newer one', async () => {
    const stale: ((response: Response) => void)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: string, init?: RequestInit) => {
        const { surface, freeText } = JSON.parse(String(init?.body)) as SearchBody
        if (freeText === 'work') return new Promise<Response>((resolve) => stale.push(resolve))
        const found = GRAPH_HITS[surface] ?? []
        return Response.json({ hits: found, nextCursor: null })
      })
    )
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    act(() => useObservatory.getState().openPalette('search', 'work'))
    await vi.waitFor(() => expect(stale).toHaveLength(4))
    await user.type(screen.getByRole('combobox'), 'shop')
    expect(await screen.findByText('AuthorizedRepairerCredential')).toBeInTheDocument()
    await act(async () => {
      for (const resolve of stale)
        resolve(Response.json({ hits: [{ type: 'CredentialSchema', id: 20 }], nextCursor: null }))
    })
    expect(screen.getByText('AuthorizedRepairerCredential')).toBeInTheDocument()
    expect(screen.queryByText('DriverLicense')).toBeNull()
  })

  it('gives up on a Graph search that never answers and keeps the local matches', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {})
    const timeout = new AbortController()
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal)
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
          )
      )
    )
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'ecs')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(timeoutSpy).toHaveBeenCalledWith(8000)
    expect(screen.queryByRole('alert')).toBeNull()
    act(() => timeout.abort(new DOMException('The operation timed out.', 'TimeoutError')))
    expect(await screen.findByRole('alert')).toHaveTextContent(/graph search failed/i)
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('ECS')
  })

  it('finds a corporation by #34', async () => {
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), '#34')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')[0]).toHaveTextContent(/corporation/i)
  })

  it('selects the highlighted result on Enter and closes', async () => {
    const user = userEvent.setup()
    render(<SearchPalette cfg={testnetCfg} />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'ecs')
    await user.keyboard('{Enter}')
    expect(useObservatory.getState().selected).toMatch(/^ecosystem:/)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps Tab focus inside the dialog', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button type="button">outside</button>
        <SearchPalette cfg={testnetCfg} />
      </>
    )
    await user.keyboard('/')
    const dialog = screen.getByRole('dialog', { name: /search/i })
    for (let i = 0; i < 4; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    await user.tab({ shift: true })
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('Escape closes the palette without clearing the selection', async () => {
    const user = userEvent.setup()
    useObservatory.setState({ selected: 'ecosystem:14' })
    render(
      <>
        <Inspector frontendUrl="https://app.testnet.verana.network" chainId="vna-testnet-1" />
        <SearchPalette cfg={testnetCfg} />
      </>
    )
    await user.keyboard('/')
    await act(async () => {
      await user.keyboard('{Escape}')
    })
    expect(screen.queryByRole('dialog', { name: /search/i })).toBeNull()
    expect(useObservatory.getState().selected).toBe('ecosystem:14')
  })
})
