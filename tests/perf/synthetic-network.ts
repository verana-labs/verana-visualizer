import type { RawNetwork } from '@/domain/network-model'
import {
  type Corporation,
  type CredentialSchema,
  corporationSchema,
  credentialSchemaSchema,
  type Ecosystem,
  ecosystemSchema,
  type Participant,
  participantSchema,
} from '@/lib/api/schemas'
import corporationRows from '../fixtures/testnet/corporations.json'
import ecosystemRows from '../fixtures/testnet/ecosystems.json'
import participantRows from '../fixtures/testnet/participants.json'
import schemaRows from '../fixtures/testnet/schemas.json'

const ECOSYSTEMS = 20
const SCHEMAS_PER_ECOSYSTEM = 3
const GRANTORS_PER_SCHEMA = 2
const DID_POOL = 1500
const LEAF_ROLES = ['ISSUER', 'VERIFIER', 'HOLDER'] as const

const ecosystemTemplate = ecosystemSchema.parse(ecosystemRows[0])
const schemaTemplate = credentialSchemaSchema.parse(schemaRows[0])
const participantTemplate = participantSchema.parse(participantRows[0])
const corporationTemplate = corporationSchema.parse(corporationRows[0])

const didOf = (n: number) => `did:web:agent-${n % DID_POOL}.perf.example`

export function syntheticNetwork(participantCount: number): RawNetwork {
  const ecosystems: Ecosystem[] = []
  const corporations: Corporation[] = []
  const schemas: CredentialSchema[] = []
  const participants: Participant[] = []
  const grantors: { id: number; schema: number; ecosystem: number }[] = []

  const addParticipant = (role: string, schema: number, ecosystem: number, validator: number | null) => {
    const id = participants.length + 1
    participants.push({
      ...participantTemplate,
      id,
      role,
      schema_id: schema,
      ecosystem_id: ecosystem,
      corporation_id: ecosystem,
      did: didOf(id),
      validator_participant_id: validator,
      op_state: 'VALIDATED',
      participant_state: 'ACTIVE',
    })
    return id
  }

  for (let e = 1; e <= ECOSYSTEMS; e++) {
    corporations.push({
      ...corporationTemplate,
      id: e,
      did: `did:web:corp-${e}.perf.example`,
      policy_address: `verana1perf${e}`,
    })
    ecosystems.push({ ...ecosystemTemplate, id: e, corporation_id: e, did: `did:web:eco-${e}.perf.example` })
    for (let s = 0; s < SCHEMAS_PER_ECOSYSTEM; s++) {
      const schema = (e - 1) * SCHEMAS_PER_ECOSYSTEM + s + 1
      schemas.push({ ...schemaTemplate, id: schema, ecosystem_id: e })
      const root = addParticipant('ECOSYSTEM', schema, e, null)
      for (let g = 0; g < GRANTORS_PER_SCHEMA; g++) {
        const role = g % 2 === 0 ? 'ISSUER_GRANTOR' : 'VERIFIER_GRANTOR'
        grantors.push({ id: addParticipant(role, schema, e, root), schema, ecosystem: e })
      }
    }
  }

  for (let n = 0; participants.length < participantCount; n++) {
    const grantor = grantors[n % grantors.length]
    addParticipant(LEAF_ROLES[n % LEAF_ROLES.length], grantor.schema, grantor.ecosystem, grantor.id)
  }

  const kept = participants.slice(0, participantCount)
  const dids = [...new Set(kept.flatMap((p) => p.did ?? []))]
  return { ecosystems, schemas, participants: kept, corporations, dids }
}
