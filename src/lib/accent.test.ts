import { describe, expect, it } from 'vitest'
import { accentFor } from './accent'

describe('accentFor', () => {
  it('gives each network its own accent', () => {
    expect(accentFor('devnet')).toBe('#f59e0b')
    expect(accentFor('testnet')).toBe('#9F7AEA')
    expect(accentFor('Devnet')).toBe('#f59e0b')
    expect(accentFor('mainnet')).toBe('#9F7AEA')
  })
})
