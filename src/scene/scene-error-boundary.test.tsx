import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { SceneErrorBoundary } from './scene-error-boundary'

function Exploding(): never {
  throw new Error('shader failed to compile')
}

afterEach(() => vi.restoreAllMocks())

describe('SceneErrorBoundary', () => {
  it('renders its children while the scene is healthy', () => {
    render(
      <SceneErrorBoundary fallback={() => <p>list</p>}>
        <p>scene</p>
      </SceneErrorBoundary>
    )
    expect(screen.getByText('scene')).toBeInTheDocument()
  })

  it('swaps a crashed renderer for the fallback, naming the failure, and logs it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    render(
      <SceneErrorBoundary fallback={(message) => <p>{`list: ${message}`}</p>}>
        <Exploding />
      </SceneErrorBoundary>
    )
    expect(screen.getByText('list: shader failed to compile')).toBeInTheDocument()
    expect(error).toHaveBeenCalledWith('The 3D scene crashed, showing the list instead', expect.any(Error))
  })
})
