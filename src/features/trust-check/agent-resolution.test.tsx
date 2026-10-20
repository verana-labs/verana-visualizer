import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hud } from '@/features/hud/hud'
import { testnetModel } from '@/features/search/search-fixture'
import { useObservatory } from '@/store/observatory-store'
import { resolveAgents } from './agent-resolution'
import { testnetCfg } from './trust-fixture'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('') }))

interface Pending {
  did: string
  settle: (trusted: boolean | Error) => void
}

function controlledResolver() {
  const pending: Pending[] = []
  let inFlight = 0
  let maxInFlight = 0
  const resolve = (did: string) =>
    new Promise<boolean>((done, fail) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      pending.push({
        did,
        settle: (outcome) => {
          inFlight--
          if (outcome instanceof Error) fail(outcome)
          else done(outcome)
        },
      })
    })
  return { resolve, pending, max: () => maxInFlight }
}

const services = () => {
  const key = screen.getByText('services')
  return within(key.parentElement as HTMLElement).getByTestId('figure').textContent
}

const flush = () => act(async () => {})

beforeEach(() => {
  useObservatory.setState({ model: testnetModel(), agentVerdicts: new Map(), blockHeight: 1 })
})

describe('resolveAgents', () => {
  it('resolves with a concurrency of 4', async () => {
    const dids = Array.from({ length: 10 }, (_, i) => `did:web:agent-${i}.example.org`)
    const resolver = controlledResolver()
    const run = resolveAgents(dids, resolver.resolve, () => {})
    await flush()
    expect(resolver.pending).toHaveLength(4)
    for (let settled = 0; settled < dids.length; settled++) {
      resolver.pending[settled].settle(true)
      await flush()
    }
    await run
    expect(resolver.max()).toBe(4)
    expect(resolver.pending.map((p) => p.did)).toEqual(dids)
  })

  it('updates the HUD as each verdict arrives and leaves a failed resolve unresolved', async () => {
    const [a, b, c] = testnetModel().agents.map((agent) => agent.did as string)
    const resolver = controlledResolver()
    const setVerdict = (did: string, trusted: boolean) =>
      useObservatory.getState().setAgentVerdict(`agent:${did}`, trusted)
    render(<Hud cfg={testnetCfg} />)
    expect(services()).toBe('0 / 0')

    const run = resolveAgents([a, b, c], resolver.resolve, setVerdict)
    await flush()
    resolver.pending[0].settle(true)
    await flush()
    expect(services()).toBe('1 / 1')

    resolver.pending[1].settle(new Error('HTTP 500 from POST resolve'))
    await flush()
    expect(services()).toBe('1 / 1')
    expect(useObservatory.getState().agentVerdicts.has(`agent:${b}`)).toBe(false)

    resolver.pending[2].settle(false)
    await run
    await flush()
    expect(services()).toBe('1 / 2')
    expect(useObservatory.getState().agentVerdicts.get(`agent:${c}`)).toBe(false)
  })

  it('stops starting new resolves once aborted', async () => {
    const dids = Array.from({ length: 8 }, (_, i) => `did:web:agent-${i}.example.org`)
    const resolver = controlledResolver()
    const controller = new AbortController()
    const run = resolveAgents(dids, resolver.resolve, () => {}, controller.signal)
    await flush()
    controller.abort()
    for (const p of resolver.pending) p.settle(true)
    await run
    expect(resolver.pending).toHaveLength(4)
  })
})
