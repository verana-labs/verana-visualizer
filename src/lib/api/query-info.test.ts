import { describe, expect, it } from 'vitest'
import { toCurl } from './query-info'

describe('toCurl', () => {
  it('renders a POST with a JSON body', () => {
    expect(
      toCurl({
        method: 'POST',
        url: 'https://idx.testnet.verana.network/v4/verifiable-trust/resolve',
        headers: { 'content-type': 'application/json' },
        body: { did: 'did:x' },
      })
    ).toBe(
      `curl -X POST 'https://idx.testnet.verana.network/v4/verifiable-trust/resolve' -H 'content-type: application/json' -d '{"did":"did:x"}'`
    )
  })

  it('renders a GET with headers and no method flag', () => {
    expect(
      toCurl({
        method: 'GET',
        url: 'https://idx.testnet.verana.network/v4/ecosystem/list?limit=1',
        headers: { 'At-Block-Height': '44200' },
      })
    ).toBe(`curl 'https://idx.testnet.verana.network/v4/ecosystem/list?limit=1' -H 'At-Block-Height: 44200'`)
  })

  it('escapes single quotes', () => {
    expect(toCurl({ method: 'GET', url: "https://a.b/x'y", headers: {} })).toBe(`curl 'https://a.b/x'\\''y'`)
  })
})
