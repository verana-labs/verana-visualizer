import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { useChainSceneShown } from './chain-lens-scene'
import { TWEEN_MS } from './use-lens-tween'

beforeEach(() => {
  vi.useFakeTimers()
  useObservatory.setState({ lens: 'chain', lensFrom: 'network', lensChangedAt: 0 })
})

afterEach(() => vi.useRealTimers())

describe('useChainSceneShown', () => {
  it('keeps the chain scene through its fade-out, then unmounts it', () => {
    const { result } = renderHook(() => useChainSceneShown())
    expect(result.current).toBe(true)
    act(() => useObservatory.setState({ lens: 'network', lensFrom: 'chain', lensChangedAt: 1 }))
    expect(result.current).toBe(true)
    act(() => vi.advanceTimersByTime(TWEEN_MS))
    expect(result.current).toBe(false)
    act(() => useObservatory.setState({ lens: 'chain', lensFrom: 'network', lensChangedAt: 2 }))
    expect(result.current).toBe(true)
  })
})
