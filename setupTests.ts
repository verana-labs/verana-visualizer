import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Minimal mocks for Next.js modules that may appear in components under test
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { default: React } = require('react')
    // Render a standard img in tests
    return React.createElement('img', props)
  }
}))


