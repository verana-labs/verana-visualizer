import { describe, expect, it } from 'vitest'
import { legacyRedirect, permalinkFor } from './legacy-redirects'

const r = (path: string, q = '') => legacyRedirect(path, new URLSearchParams(q))

describe('legacyRedirect', () => {
  it('maps query-based routes', () => {
    expect(r('/did-directory', 'did=did:x')).toBe('/?sel=agent:did%3Ax')
    expect(r('/did-directory', 'controller=verana1abc')).toBe('/?q=verana1abc')
    expect(r('/did-directory')).toBe('/')
    expect(r('/permissions', 'permission=158')).toBe('/?sel=participant:158')
    expect(r('/permissions')).toBe('/')
  })

  it('maps path-only routes', () => {
    expect(r('/dashboard')).toBe('/?lens=chain')
    expect(r('/trust-registries')).toBe('/?lens=network')
    expect(r('/network-graph')).toBe('/')
    expect(r('/governance')).toBe('/?lens=governance')
    expect(r('/governance/12')).toBe('/?lens=governance&sel=proposal:12')
    expect(r('/ecosystem')).toBe('/?lens=registry')
    expect(r('/developer-activity')).toBe('/')
  })

  it('maps permalinks', () => {
    expect(permalinkFor('participant', '158')).toBe('/?sel=participant:158')
    expect(permalinkFor('schema', '7')).toBe('/?sel=schema:7')
    expect(permalinkFor('did', 'did:web:x')).toBe('/?sel=agent:did%3Aweb%3Ax')
    expect(permalinkFor('did', 'did%3Aweb%3Ax')).toBe('/?sel=agent:did%3Aweb%3Ax')
    expect(permalinkFor('bogus', '1')).toBe('/')
    expect(permalinkFor('participant', 'abc')).toBe('/')
    expect(permalinkFor('did', 'did:x')).toBe('/?sel=agent:did%3Ax')
  })

  it('ignores unrelated paths', () => {
    expect(r('/')).toBeNull()
    expect(r('/other')).toBeNull()
  })
})
