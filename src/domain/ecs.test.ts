import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CredentialSchema } from '@/lib/api/schemas'
import { canonicalJson, ECS_DIGESTS, ecsKinds, ecsSchemaDigest, isEcsCompliant } from './ecs'

const schemas = JSON.parse(
  readFileSync(join(__dirname, '../../tests/fixtures/testnet/schemas.json'), 'utf8')
) as CredentialSchema[]
const ecsEcosystem = schemas.filter((s) => s.ecosystem_id === 2)
const byTitle = (title: string) => {
  const schema = ecsEcosystem.find((s) => s.title === title)
  if (!schema) throw new Error(`fixture has no ${title}`)
  return schema
}

describe('canonicalJson (RFC 8785)', () => {
  it('serialises the RFC 8785 §3.2.2 sample exactly', () => {
    const input =
      '{"numbers":[333333333.33333329,1E30,4.50,2e-3,0.000000000000000000000000001],' +
      '"string":"\\u20ac$\\u000F\\u000aA\'\\u0042\\u0022\\u005c\\\\\\"\\/","literals":[null,true,false]}'
    expect(canonicalJson(JSON.parse(input))).toBe(
      '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],' +
        '"string":"€$\\u000f\\nA\'B\\"\\\\\\\\\\"/"}'
    )
  })

  it('sorts properties by UTF-16 code units (RFC 8785 §3.2.3)', () => {
    const input =
      '{"\\u20ac":"Euro Sign","\\r":"Carriage Return","\\ufb33":"Hebrew Letter Dalet With Dagesh","1":"One",' +
      '"\\ud83d\\ude00":"Emoji: Grinning Face","\\u0080":"Control","\\u00f6":"Latin Small Letter O With Diaeresis"}'
    const keys = Object.keys(JSON.parse(canonicalJson(JSON.parse(input))) as Record<string, string>)
    expect(keys.map((k) => k.codePointAt(0)?.toString(16))).toEqual(['31', 'd', '80', 'f6', '20ac', '1f600', 'fb33'])
    expect(canonicalJson(JSON.parse(input)).startsWith('{"\\r":"Carriage Return","1":"One","\u0080":"Control"')).toBe(
      true
    )
  })

  it('rejects values JSON cannot represent', () => {
    expect(() => canonicalJson(Number.NaN)).toThrow(/finite/)
    expect(() => canonicalJson({ a: undefined })).toThrow(/undefined/)
  })
})

describe('ecsSchemaDigest', () => {
  it.each([
    ['ServiceCredential', ECS_DIGESTS.ServiceCredential],
    ['OrganizationCredential', ECS_DIGESTS.OrganizationCredential],
    ['PersonaCredential', ECS_DIGESTS.PersonaCredential],
    ['UserAgentCredential', ECS_DIGESTS.UserAgentCredential],
    ['BadgeCredential', ECS_DIGESTS.BadgeCredential],
  ])('reproduces the spec digest of testnet ecosystem:2 %s', async (title, digest) => {
    await expect(ecsSchemaDigest(byTitle(title).json_schema)).resolves.toBe(digest)
  })

  it('ignores $id, which varies per deployment', async () => {
    const schema = JSON.parse(byTitle('ServiceCredential').json_schema) as Record<string, unknown>
    const moved = JSON.stringify({ ...schema, $id: 'vpr:verana:vna-devnet-1:cs:99' })
    await expect(ecsSchemaDigest(moved)).resolves.toBe(ECS_DIGESTS.ServiceCredential)
  })

  it('changes when the schema content changes', async () => {
    const schema = JSON.parse(byTitle('ServiceCredential').json_schema) as Record<string, unknown>
    await expect(ecsSchemaDigest(JSON.stringify({ ...schema, title: 'Other' }))).resolves.not.toBe(
      ECS_DIGESTS.ServiceCredential
    )
  })

  it('fails with context on a json_schema that is not a JSON object', async () => {
    await expect(ecsSchemaDigest('[1]')).rejects.toThrow(/JSON object/)
    await expect(ecsSchemaDigest('{oops')).rejects.toThrow()
  })
})

describe('isEcsCompliant', () => {
  it('passes the testnet ECS ecosystem, which holds all 5 essential schemas', async () => {
    await expect(isEcsCompliant(ecsEcosystem)).resolves.toBe(true)
    await expect(ecsKinds(ecsEcosystem)).resolves.toHaveLength(5)
  })

  it('fails an ecosystem missing one essential schema', async () => {
    await expect(isEcsCompliant(ecsEcosystem.filter((s) => s.title !== 'BadgeCredential'))).resolves.toBe(false)
  })

  it('ignores archived schemas', async () => {
    const archived = ecsEcosystem.map((s) => (s.title === 'PersonaCredential' ? { ...s, archived: '2026-10-01' } : s))
    await expect(isEcsCompliant(archived)).resolves.toBe(false)
  })

  it('fails ordinary ecosystems', async () => {
    await expect(isEcsCompliant(schemas.filter((s) => s.ecosystem_id === 11))).resolves.toBe(false)
    await expect(isEcsCompliant([])).resolves.toBe(false)
  })
})
