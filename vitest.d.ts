/// <reference types="vitest/globals" />
import '@testing-library/jest-dom'

declare global {
  namespace Vi {
    interface MockContext {}
  }
}
