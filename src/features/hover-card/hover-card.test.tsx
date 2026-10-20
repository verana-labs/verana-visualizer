import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildNetworkModel, type RawNetwork } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { clampToViewport, HoverCard } from './hover-card'

const fixture = <T,>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const raw: RawNetwork = {
  ecosystems: fixture('ecosystems'),
  schemas: fixture('schemas'),
  participants: fixture('participants'),
  corporations: fixture('corporations'),
  dids: fixture<{ dids: string[] }>('dids').dids,
}
const model = buildNetworkModel(raw)

const row = (label: string) => {
  const key = screen.getByText(label)
  return within(key.parentElement as HTMLElement).getByTestId('value').textContent
}

beforeEach(() => {
  useObservatory.setState({ model, hovered: null, agentVerdicts: new Map() })
})

describe('HoverCard', () => {
  it('stays hidden while nothing is hovered', () => {
    const { container } = render(<HoverCard />)
    expect(container.querySelector('[data-testid="hover-card"]')).toBeNull()
  })

  it('shows the real figures of a hovered ecosystem', () => {
    useObservatory.setState({ hovered: 'ecosystem:2' })
    render(<HoverCard />)
    expect(screen.getByTestId('hover-card')).toHaveTextContent('ECS')
    expect(row('Participants')).toBe('90')
    expect(row('Credential schemas')).toBe('5')
    expect(row('Credentials issued')).toBe('73')
  })

  it('shows the role, state and accrediting parent of a participant', () => {
    useObservatory.setState({ hovered: 'participant:158' })
    render(<HoverCard />)
    expect(screen.getByTestId('role-chip')).toHaveTextContent('Issuer')
    expect(screen.getByTestId('state-chip')).toHaveTextContent('ACTIVE')
    expect(row('Accredited by')).toBe('ECS Ecosystem')
  })

  it('ignores the rocket and follows hover changes', () => {
    useObservatory.setState({ hovered: 'rocket' })
    render(<HoverCard />)
    expect(screen.queryByTestId('hover-card')).toBeNull()
    act(() => useObservatory.setState({ hovered: 'ecosystem:2' }))
    expect(screen.getByTestId('hover-card')).toBeInTheDocument()
  })
})

describe('clampToViewport', () => {
  const viewport = { width: 1000, height: 800 }
  const card = { width: 240, height: 140 }

  it('places the card just below and right of the pointer', () => {
    expect(clampToViewport({ x: 100, y: 100 }, card, viewport)).toEqual({ left: 116, top: 114 })
  })

  it('keeps the card inside the right and bottom edges', () => {
    const { left, top } = clampToViewport({ x: 990, y: 790 }, card, viewport)
    expect(left + card.width).toBeLessThanOrEqual(viewport.width)
    expect(top + card.height).toBeLessThanOrEqual(viewport.height)
    expect(left).toBeGreaterThanOrEqual(0)
    expect(top).toBeGreaterThanOrEqual(0)
  })
})
