import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AGENT_COLORS } from '@/domain/roles'
import { testnetModel } from '@/features/search/search-fixture'
import { useObservatory } from '@/store/observatory-store'
import { ListFallback } from './list-fallback'

const model = testnetModel()
const PAPAPO = model.agents.find((agent) => agent.did?.endsWith('verana.papapo.shoes'))
const ECS = model.agents.find((agent) => agent.did?.endsWith('ecs-ecosystem.testnet.verana.network'))

const dotOf = (id: string | undefined) => {
  const row = screen.getByTestId('list-fallback').querySelector(`[data-id="${id}"]`)
  return (row?.querySelector('span') as HTMLElement).style.background
}

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

beforeEach(() => {
  if (!PAPAPO || !ECS) throw new Error('fixture agents missing')
  useObservatory.setState({
    model,
    agentVerdicts: new Map([
      [ECS.id, true],
      [PAPAPO.id, false],
    ]),
  })
})

describe('ListFallback', () => {
  it('colours agents by their resolved verdict', () => {
    render(<ListFallback model={model} />)
    expect(dotOf(PAPAPO?.id)).toBe(rgb(AGENT_COLORS.untrusted))
    expect(dotOf(ECS?.id)).toBe(rgb(AGENT_COLORS.trusted))
  })

  it('keeps unresolved agents in the resolving colour', () => {
    useObservatory.setState({ agentVerdicts: new Map() })
    render(<ListFallback model={model} />)
    expect(dotOf(PAPAPO?.id)).toBe(rgb(AGENT_COLORS.resolving))
  })

  it('says why when it stands in for a crashed 3D scene', () => {
    render(<ListFallback model={model} notice="The 3D view stopped working (context lost)." />)
    expect(screen.getByTestId('list-fallback')).toHaveTextContent('The 3D view stopped working (context lost).')
  })

  it('lists corporation, schema and proposal matches too, so search finds every kind', async () => {
    const user = userEvent.setup()
    render(<ListFallback model={model} />)
    await user.type(screen.getByRole('searchbox', { name: 'Search the network' }), '#34')
    const other = screen.getByRole('region', { name: 'Other matches' })
    expect(within(other).getByRole('button', { name: /Papapo/ })).toHaveAttribute('data-id', 'corporation:34')
  })
})
