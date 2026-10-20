import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeStore } from '@/features/time-scrubber/time-store'
import { T_DEBOUNCE_MS, useTimeUrl } from '@/features/time-scrubber/use-time-url'
import { useObservatory } from '@/store/observatory-store'
import { LensBar } from './lens-bar'

const lagging = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => lagging,
}))

beforeEach(() => {
  vi.useFakeTimers()
  useTimeStore.getState().reset()
  useObservatory.setState({ lens: 'network' })
  window.history.replaceState(null, '', '/')
})

afterEach(() => vi.useRealTimers())

describe('lens switch racing the debounced t write', () => {
  it('keeps lens=time when a pending t write fires after the switch', () => {
    render(<LensBar />)
    renderHook(() => useTimeUrl())
    fireEvent.click(screen.getByRole('button', { name: 'Chain' }))
    act(() => useTimeStore.getState().setHeight(7000))
    fireEvent.click(screen.getByRole('button', { name: 'Time' }))
    act(() => vi.advanceTimersByTime(T_DEBOUNCE_MS))
    const url = new URL(window.location.href)
    expect(url.searchParams.get('lens')).toBe('time')
    expect(url.searchParams.get('t')).toBe('7000')
  })
})
