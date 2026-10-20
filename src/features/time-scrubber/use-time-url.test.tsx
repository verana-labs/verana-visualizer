import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeStore } from './time-store'
import { T_DEBOUNCE_MS, useTimeUrl } from './use-time-url'

const replace = vi.fn()
let params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/',
  useSearchParams: () => params,
}))

beforeEach(() => {
  vi.useFakeTimers()
  replace.mockClear()
  useTimeStore.getState().reset()
  params = new URLSearchParams('lens=time')
  window.history.replaceState(null, '', '/?lens=time')
})

afterEach(() => vi.useRealTimers())

describe('useTimeUrl', () => {
  it('writes t once, 250 ms after scrubbing stops', () => {
    renderHook(() => useTimeUrl())
    act(() => {
      useTimeStore.getState().setHeight(7000)
      vi.advanceTimersByTime(100)
      useTimeStore.getState().setHeight(7050)
      vi.advanceTimersByTime(100)
      useTimeStore.getState().setHeight(7070)
    })
    expect(T_DEBOUNCE_MS).toBe(250)
    act(() => vi.advanceTimersByTime(249))
    expect(replace).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/?lens=time&t=7070', { scroll: false })
  })

  it('drops t when the lens returns to live', () => {
    window.history.replaceState(null, '', '/?lens=network&t=7070')
    renderHook(() => useTimeUrl())
    act(() => {
      useTimeStore.getState().setHeight(7070)
      useTimeStore.getState().setHeight(null)
      vi.advanceTimersByTime(250)
    })
    expect(replace).toHaveBeenCalledWith('/', { scroll: false })
  })

  it('drops a stale t that another lens switch carried over', () => {
    params = new URLSearchParams('lens=governance&t=7084')
    window.history.replaceState(null, '', '/?lens=governance&t=7084')
    renderHook(() => useTimeUrl())
    expect(replace).toHaveBeenCalledWith('/?lens=governance', { scroll: false })
  })

  it('returns the t to restore from the shared link', () => {
    params = new URLSearchParams('lens=time&t=7070')
    const { result } = renderHook(() => useTimeUrl())
    expect(result.current).toBe(7070)
  })
})
