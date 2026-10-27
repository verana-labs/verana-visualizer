import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { ECS_DID, PAPAPO_DID, testnetCfg } from '../../../tests/support/network'
import { testnetModel } from '../../../tests/support/recorded'
import { stubTrustNetwork } from '../../../tests/support/trust-fixture'
import { useTrustCheckRunner } from './use-trust-check-runner'

beforeEach(() => {
  useObservatory.setState({ model: testnetModel(), selected: null, trustCheck: null, agentVerdicts: new Map() })
})

afterEach(() => vi.unstubAllGlobals())

describe('useTrustCheckRunner', () => {
  it('runs a requested check and stores its result with a trace start time', async () => {
    stubTrustNetwork()
    renderHook(() => useTrustCheckRunner(testnetCfg))
    act(() => useObservatory.getState().requestTrustCheck(PAPAPO_DID))
    await vi.waitFor(() => expect(useObservatory.getState().trustCheck?.result).not.toBeNull())
    const state = useObservatory.getState().trustCheck
    expect(state?.result?.path).toEqual([`agent:${PAPAPO_DID}`, 'participant:158', 'participant:5', 'ecosystem:2'])
    expect(state?.tracedAt).toEqual(expect.any(Number))
  })

  it('drops a stale result when a newer check was requested', async () => {
    stubTrustNetwork()
    renderHook(() => useTrustCheckRunner(testnetCfg))
    act(() => {
      useObservatory.getState().requestTrustCheck(PAPAPO_DID)
      useObservatory.getState().requestTrustCheck(ECS_DID)
    })
    await vi.waitFor(() => expect(useObservatory.getState().trustCheck?.result).not.toBeNull())
    expect(useObservatory.getState().trustCheck?.result?.did).toBe(ECS_DID)
  })

  it('re-runs the path once the model arrives for a check requested before it', async () => {
    const model = useObservatory.getState().model
    useObservatory.setState({ model: null })
    const calls = stubTrustNetwork()
    renderHook(() => useTrustCheckRunner(testnetCfg))
    act(() => useObservatory.getState().requestTrustCheck(PAPAPO_DID))
    await vi.waitFor(() => expect(useObservatory.getState().trustCheck?.result).not.toBeNull())
    expect(useObservatory.getState().trustCheck?.result?.path).toEqual([])
    act(() => useObservatory.setState({ model }))
    await vi.waitFor(() =>
      expect(useObservatory.getState().trustCheck?.result?.path).toEqual([
        `agent:${PAPAPO_DID}`,
        'participant:158',
        'participant:5',
        'ecosystem:2',
      ])
    )
    expect(useObservatory.getState().trustCheck?.subject).toBe(`agent:${PAPAPO_DID}`)
    expect(useObservatory.getState().selected).toBe(`agent:${PAPAPO_DID}`)
    expect(calls.filter((c) => c.url.endsWith('/v4/graph/traverse'))).toHaveLength(1)
  })
})
