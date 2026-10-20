import type { CredentialSchema } from '@/lib/api/schemas'
import { logger } from '@/lib/logger'

export const ECS_SPEC_URL =
  'https://verana-labs.github.io/verifiable-trust-spec/#ecs-ec-essential-credential-schemas-ecosystem'

export const ECS_DIGESTS = {
  ServiceCredential: 'sha384-0v+BAFGpnBX/RVqH9dUlMglxMrD4AKy4qUtb1lMN4iW9I2gO7XjcUfmGOf0oInP3',
  OrganizationCredential: 'sha384-UPn4TDqS1nMBAN3FyMzTAZOWp99zBjBD69OjpbhwOKZj7iOrS5qPwJ2SArRz0yzu',
  PersonaCredential: 'sha384-VfXTfuks02OkoR5USaTfEdc4NU25m4+vNrLATnjC0r0Pn1S3tFTdOvGCfSYdjE2I',
  UserAgentCredential: 'sha384-rIWkh3zBD1Ak7CNGpAwZ/ONSmf+ywOYSF3H60ULc9/a1ZYKv6EqiQMJ2dm8dOfjm',
  BadgeCredential: 'sha384-ZxJ2aRpoF/5DJSILWwOES6bmpMg3RZYOfO2CCF8hC/YDNvU+PhCqAnAXq/66nXCq',
} as const

export type EcsKind = keyof typeof ECS_DIGESTS

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`JCS cannot serialise the non-finite number ${value}`)
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  throw new Error(`JCS cannot serialise a value of type ${typeof value}`)
}

function base64(bytes: ArrayBuffer): string {
  let binary = ''
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export async function ecsSchemaDigest(jsonSchema: string): Promise<string> {
  const parsed: unknown = JSON.parse(jsonSchema)
  if (!isPlainObject(parsed)) throw new Error('ECS digest: json_schema is not a JSON object')
  const { $id: _id, ...rest } = parsed
  const digest = await crypto.subtle.digest('SHA-384', new TextEncoder().encode(canonicalJson(rest)))
  return `sha384-${base64(digest)}`
}

const KIND_OF_DIGEST = new Map<string, EcsKind>(
  Object.entries(ECS_DIGESTS).map(([kind, digest]) => [digest, kind as EcsKind])
)

async function digestOrNull(schema: CredentialSchema): Promise<string | null> {
  try {
    return await ecsSchemaDigest(schema.json_schema)
  } catch (error) {
    logger.warn(`Credential schema ${schema.id} is not an ECS candidate: its json_schema cannot be digested`, error)
    return null
  }
}

export async function ecsKinds(schemas: readonly CredentialSchema[]): Promise<EcsKind[]> {
  const digests = await Promise.all(schemas.filter((s) => !s.archived).map(digestOrNull))
  const kinds = new Set(digests.flatMap((digest) => (digest === null ? [] : (KIND_OF_DIGEST.get(digest) ?? []))))
  return (Object.keys(ECS_DIGESTS) as EcsKind[]).filter((kind) => kinds.has(kind))
}

export async function isEcsCompliant(schemas: readonly CredentialSchema[]): Promise<boolean> {
  return (await ecsKinds(schemas)).length === Object.keys(ECS_DIGESTS).length
}
