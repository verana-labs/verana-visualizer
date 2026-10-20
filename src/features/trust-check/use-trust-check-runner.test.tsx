import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { useObservatory } from '@/store/observatory-store'
import { ECS_DID, PAPAPO_DID, stubTrustNetwork, testnetCfg } from './trust-fixture'
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
})
