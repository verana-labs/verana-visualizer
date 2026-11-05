import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { testnetModel } from '../../../tests/support/recorded'
import { useSelectionUrl } from './use-selection-url'

let params = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => params,
}))

beforeEach(() => {
  useObservatory.setState({ model: null, selected: null, toast: null })
  window.history.replaceState(null, '', '/')
})

describe('useSelectionUrl', () => {
  it('restores an existing sel once the model loads', () => {
    params = new URLSearchParams('sel=participant:157')
    renderHook(() => useSelectionUrl('vna-testnet-1', true))
    act(() => useObservatory.setState({ model: testnetModel() }))
    expect(useObservatory.getState().selected).toBe('participant:157')
    expect(useObservatory.getState().toast).toBeNull()
  })

  it('toasts Not found, keeps the overview and drops sel from the URL for a missing id', () => {
    params = new URLSearchParams('sel=participant:999999&lens=trust')
    window.history.replaceState(null, '', '/?sel=participant:999999&lens=trust')
    renderHook(() => useSelectionUrl('vna-testnet-1', true))
    act(() => useObservatory.setState({ model: testnetModel() }))
    expect(useObservatory.getState().toast).toBe('Not found on vna-testnet-1')
    expect(useObservatory.getState().selected).toBeNull()
    expect(`${window.location.pathname}${window.location.search}`).toBe('/?lens=trust')
  })

  it('holds the toast until the app is ready but still drops sel immediately', () => {
    params = new URLSearchParams('sel=participant:999999')
    window.history.replaceState(null, '', '/?sel=participant:999999')
    const { rerender } = renderHook(({ ready }) => useSelectionUrl('vna-testnet-1', ready), {
      initialProps: { ready: false },
    })
    act(() => useObservatory.setState({ model: testnetModel() }))
    expect(`${window.location.pathname}${window.location.search}`).toBe('/')
    expect(useObservatory.getState().toast).toBeNull()
    rerender({ ready: true })
    expect(useObservatory.getState().toast).toBe('Not found on vna-testnet-1')
  })

  it('writes sel to the URL when a result is selected', () => {
    params = new URLSearchParams()
    renderHook(() => useSelectionUrl('vna-testnet-1', true))
    act(() => useObservatory.getState().select('ecosystem:14'))
    expect(`${window.location.pathname}${window.location.search}`).toBe('/?sel=ecosystem:14')
  })
})
