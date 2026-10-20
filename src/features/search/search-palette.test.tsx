import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fromGovProposal, withProposals } from '@/domain/governance'
import { Inspector } from '@/features/inspector/inspector'
import { useObservatory } from '@/store/observatory-store'
import { testnetModel } from './search-fixture'
import { SearchPalette } from './search-palette'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  globalThis.ResizeObserver = ResizeObserverStub
  Element.prototype.scrollIntoView = () => {}
  useObservatory.setState({ model: testnetModel(), selected: null, palette: 'closed' })
})

describe('SearchPalette', () => {
  it('opens prefilled with a query handed over by a legacy link', () => {
    render(<SearchPalette />)
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
    render(<SearchPalette />)
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
    render(<SearchPalette />)
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
        <SearchPalette />
      </>
    )
    await user.click(screen.getByLabelText('other'))
    await user.keyboard('/')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens from the trigger button', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lists ECS first under the ecosystem group', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
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
    render(<SearchPalette />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), 'rotate')
    const group = screen.getByTestId('search-group')
    expect(group).toHaveAttribute('data-kind', 'proposal')
    expect(group).toHaveTextContent('Proposals')
    expect(within(group).getByRole('option')).toHaveTextContent('Rotate keys')
  })

  it('finds a corporation by #34', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
    await user.keyboard('/')
    await user.type(screen.getByRole('combobox'), '#34')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')[0]).toHaveTextContent(/corporation/i)
  })

  it('selects the highlighted result on Enter and closes', async () => {
    const user = userEvent.setup()
    render(<SearchPalette />)
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
        <SearchPalette />
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
        <SearchPalette />
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
