/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'
import React from 'react'

// Minimal mocks for Next.js modules that may appear in components under test
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { priority, ...rest } = props
    return React.createElement('img', rest)
  }
}))

// Setup localStorage mock for jsdom
if (typeof window !== 'undefined') {
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString()
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      }
    }
  })()
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
}

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


