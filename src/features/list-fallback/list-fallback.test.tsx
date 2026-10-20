import { render, screen } from '@testing-library/react'
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
})
