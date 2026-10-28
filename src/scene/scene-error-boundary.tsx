'use client'

import { Component, type ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface SceneErrorBoundaryProps {
  children: ReactNode
  fallback: (message: string) => ReactNode
}

interface SceneErrorBoundaryState {
  message: string | null
}

export class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  state: SceneErrorBoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): SceneErrorBoundaryState {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown) {
    logger.error('The 3D scene crashed, showing the list instead', error)
  }

  render() {
    return this.state.message === null ? this.props.children : this.props.fallback(this.state.message)
  }
}
