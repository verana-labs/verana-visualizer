import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Minimal mocks for Next.js modules that may appear in components under test
vi.mock('next/image', () => ({
  default: (props: any) => React.createElement('img', props)
}))


