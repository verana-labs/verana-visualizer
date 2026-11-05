import { describe, expect, it } from 'vitest'
import { safeHttpUrl } from './safe-url'

describe('safeHttpUrl', () => {
  it('rejects non-http schemes', () => {
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull()
    expect(safeHttpUrl('data:text/html,x')).toBeNull()
  })

  it('keeps http and https urls', () => {
    expect(safeHttpUrl('https://a.b/x')).toBe('https://a.b/x')
    expect(safeHttpUrl('http://a.b')).toBe('http://a.b')
  })

  it('rejects non-strings and garbage', () => {
    expect(safeHttpUrl(undefined)).toBeNull()
    expect(safeHttpUrl(42)).toBeNull()
    expect(safeHttpUrl('not a url')).toBeNull()
  })
})
