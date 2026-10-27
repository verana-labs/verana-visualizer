import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeStore } from '@/features/time-scrubber/time-store'
import { useTour } from '@/features/tour/tour-store'
import { serializeViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'
import { testnetCfg } from '../../../tests/support/network'
import { useSceneHandle } from './scene-handle'
import { shareUrl } from './share-link'
import { ViewActions } from './view-actions'

const writeText = vi.fn<(text: string) => Promise<void>>()
const exportPng = vi.hoisted(() => vi.fn<(canvas: HTMLCanvasElement, stamp: unknown) => Blob>())
vi.mock('./export-png', async (original) => ({ ...(await original<object>()), exportPng }))

beforeEach(() => {
  writeText.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  window.history.replaceState(null, '', '/?lens=trust&t=1700000000')
  useObservatory.setState({ lens: 'trust', selected: 'ecosystem:1', blockHeight: 87_600, toast: null })
  useTour.setState({ step: null, presenting: false })
  useSceneHandle.setState({ handle: null })
})

afterEach(() => {
  useSceneHandle.setState({ handle: null })
  window.history.replaceState(null, '', '/')
})

describe('shareUrl', () => {
  it('is the origin, "/?" and the serialized view', () => {
    const view = {
      lens: 'chain' as const,
      sel: null,
      cam: [1, 2, 3, 0, 0, 0] as [number, number, number, number, number, number],
      t: null,
      panel: null,
      tour: null,
      q: null,
    }
    expect(shareUrl('https://vis.example', view)).toBe(`https://vis.example/?${serializeViewState(view)}`)
  })
})

describe('ViewActions', () => {
  it('copies location.origin + "/?" + the current view including the camera, and confirms with a toast', async () => {
    useSceneHandle.setState({
      handle: { camera: () => [10.123, 20, 30, 1, 2, 3], capture: () => document.createElement('canvas') },
    })
    render(<ViewActions cfg={testnetCfg} />)
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    const expected = `${location.origin}/?${serializeViewState({
      lens: 'trust',
      sel: 'ecosystem:1',
      cam: [10.123, 20, 30, 1, 2, 3],
      t: 1_700_000_000,
      panel: null,
      tour: null,
      q: null,
    })}`
    expect(writeText).toHaveBeenCalledWith(expected)
    expect(expected).toContain('cam=10.12,20,30,1,2,3')
    expect(useObservatory.getState().toast).toBe('Link copied')
  })

  it('keeps Share disabled until the camera is available, so a link never silently drops it', () => {
    render(<ViewActions cfg={testnetCfg} />)
    expect(screen.getByRole('button', { name: 'Share' })).toBeDisabled()
    act(() =>
      useSceneHandle.setState({
        handle: { camera: () => [1, 2, 3, 0, 0, 0], capture: () => document.createElement('canvas') },
      })
    )
    expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled()
  })

  it('reports a clipboard failure instead of claiming success', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    useSceneHandle.setState({
      handle: { camera: () => [1, 2, 3, 0, 0, 0], capture: () => document.createElement('canvas') },
    })
    render(<ViewActions cfg={testnetCfg} />)
    await userEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(useObservatory.getState().toast).toBe('Could not copy the link')
  })

  it('starts the presentation from the Present button', async () => {
    useObservatory.setState({ model: (await import('../../../tests/support/recorded')).testnetModel() })
    render(<ViewActions cfg={testnetCfg} />)
    await userEvent.click(screen.getByRole('button', { name: 'Present' }))
    expect(useTour.getState()).toMatchObject({ step: 0, presenting: true })
  })

  it('downloads a stamped PNG named after the chain and block', async () => {
    const canvas = document.createElement('canvas')
    useSceneHandle.setState({ handle: { camera: () => [0, 0, 1, 0, 0, 0], capture: () => canvas } })
    exportPng.mockReturnValue(new Blob(['x'], { type: 'image/png' }))
    const clicked: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.download)
    })
    URL.createObjectURL = vi.fn(() => 'blob:png')
    URL.revokeObjectURL = vi.fn()
    render(<ViewActions cfg={testnetCfg} />)
    await act(async () => screen.getByRole('button', { name: 'PNG' }).click())
    expect(exportPng).toHaveBeenCalledWith(
      canvas,
      expect.objectContaining({
        chainId: 'vna-testnet-1',
        blockHeight: 87_600,
        source: 'idx.testnet.verana.network',
      })
    )
    expect(clicked).toEqual(['verana-vna-testnet-1-block-87600.png'])
  })

  it('stamps the scrubbed block, not the live head, in the Time lens', async () => {
    const canvas = document.createElement('canvas')
    useSceneHandle.setState({ handle: { camera: () => [0, 0, 1, 0, 0, 0], capture: () => canvas } })
    exportPng.mockReset().mockReturnValue(new Blob(['x'], { type: 'image/png' }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    URL.createObjectURL = vi.fn(() => 'blob:png')
    URL.revokeObjectURL = vi.fn()
    useObservatory.setState({ lens: 'time' })
    useTimeStore.setState({ height: 38_000 })
    render(<ViewActions cfg={testnetCfg} />)
    await act(async () => screen.getByRole('button', { name: 'PNG' }).click())
    expect(exportPng).toHaveBeenCalledWith(canvas, expect.objectContaining({ blockHeight: 38_000 }))
    useTimeStore.getState().reset()
  })
})
