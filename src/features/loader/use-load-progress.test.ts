import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FetchError } from '@/lib/fetch-json'
import { useLoadProgress } from './use-load-progress'

const LABELS = [
  'Reading ecosystems…',
  'Reading schemas…',
  'Reading participants…',
  'Reading corporations…',
  'Reading block height…',
  'Reading DIDs…',
  'Laying out the network…',
]

function deferredSteps() {
  const gates = LABELS.map(() => {
    let resolve!: () => void
    let reject!: (e: unknown) => void
    const promise = new Promise<void>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject, started: vi.fn() }
  })
  const steps = LABELS.map((label, i) => ({
    label,
    barrier: i === LABELS.length - 1,
    run: () => {
      gates[i].started()
      return gates[i].promise
    },
  }))
  return { gates, steps }
}

describe('useLoadProgress', () => {
  it('reports k/7 after k steps resolve and labels the next pending step', async () => {
    const { gates, steps } = deferredSteps()
    const { result } = renderHook(() => useLoadProgress(steps))
    expect(result.current.progress).toBe(0)
    expect(result.current.label).toBe(LABELS[0])
    for (let k = 1; k <= 3; k++) {
      await act(async () => gates[k - 1].resolve())
      await waitFor(() => expect(result.current.progress).toBeCloseTo(k / 7))
      expect(result.current.label).toBe(LABELS[k])
      expect(result.current.done).toBe(false)
    }
  })

  it('starts the data steps together and the barrier step only once they all resolved', async () => {
    const { gates, steps } = deferredSteps()
    renderHook(() => useLoadProgress(steps))
    await waitFor(() => expect(gates[5].started).toHaveBeenCalledTimes(1))
    for (const gate of gates.slice(0, 6)) expect(gate.started).toHaveBeenCalledTimes(1)
    expect(gates[6].started).not.toHaveBeenCalled()
    for (const gate of gates.slice(0, 6).reverse()) await act(async () => gate.resolve())
    await waitFor(() => expect(gates[6].started).toHaveBeenCalledTimes(1))
  })

  it('counts completions in any order and labels the first step still pending', async () => {
    const { gates, steps } = deferredSteps()
    const { result } = renderHook(() => useLoadProgress(steps))
    await act(async () => gates[3].resolve())
    await act(async () => gates[1].resolve())
    await waitFor(() => expect(result.current.progress).toBeCloseTo(2 / 7))
    expect(result.current.label).toBe(LABELS[0])
  })

  it('is done at 1 once every step resolved', async () => {
    const { gates, steps } = deferredSteps()
    const { result } = renderHook(() => useLoadProgress(steps))
    for (const gate of gates) await act(async () => gate.resolve())
    await waitFor(() => expect(result.current.done).toBe(true))
    expect(result.current.progress).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('stops on the first rejection, exposes the FetchError and never reaches done', async () => {
    const { gates, steps } = deferredSteps()
    const { result } = renderHook(() => useLoadProgress(steps))
    await act(async () => gates[0].resolve())
    await act(async () => gates[1].reject(new FetchError('boom', { url: 'u', status: 503, body: null })))
    await waitFor(() => expect(result.current.error).toBeInstanceOf(FetchError))
    expect(result.current.error?.message).toBe('boom')
    expect(result.current.progress).toBeCloseTo(1 / 7)
    expect(result.current.done).toBe(false)
    await act(async () => {
      for (const gate of gates.slice(2, 6)) gate.resolve()
    })
    expect(gates[6].started).not.toHaveBeenCalled()
    expect(result.current.progress).toBeCloseTo(1 / 7)
  })

  it('wraps a non-FetchError rejection keeping its message', async () => {
    const { gates, steps } = deferredSteps()
    const { result } = renderHook(() => useLoadProgress(steps))
    await act(async () => gates[0].reject(new Error('layout exploded')))
    await waitFor(() => expect(result.current.error).toBeInstanceOf(FetchError))
    expect(result.current.error?.message).toBe('layout exploded')
  })

  it('retry reruns the steps from the start and clears the error', async () => {
    let fail = true
    const first = vi.fn(async () => {
      if (fail) throw new Error('down')
    })
    const { result } = renderHook(() => useLoadProgress([{ label: 'a', run: first }]))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    fail = false
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.done).toBe(true))
    expect(result.current.error).toBeNull()
    expect(first).toHaveBeenCalledTimes(2)
  })
})
