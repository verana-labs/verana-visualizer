import '@testing-library/jest-dom'
import React from 'react'

// Minimal mocks for Next.js modules that may appear in components under test
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { priority, ...rest } = props
    return React.createElement('img', rest)
  }
}))

// jsdom polyfill for matchMedia used by ThemeToggle
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
}


