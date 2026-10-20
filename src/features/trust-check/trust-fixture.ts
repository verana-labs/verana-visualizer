import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vi } from 'vitest'
import type { Participant } from '@/lib/api/schemas'
import { resolveNetworkConfig } from '@/lib/env'

export const ECS_DID = 'did:webvh:QmVEcKodsZWNhMx6UT7Sq4V8JBrcvohdJTutG6q88WQPhQ:ecs-ecosystem.testnet.verana.network'
export const PAPAPO_DID = 'did:webvh:QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv:verana.papapo.shoes'
export const UNKNOWN_DID = 'did:web:not-in-the-network.example.org'

export const testnetCfg = resolveNetworkConfig({
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
  NEXT_PUBLIC_VERANA_CHAIN_NAME: 'testnet',
})

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(join(process.cwd(), 'tests/fixtures/testnet', `${name}.json`), 'utf8')) as T

const rawBody = (name: string): unknown => read<{ body: unknown }>(`raw/${name}`).body

const LIST_BODIES: Record<string, string> = {
  '/v4/ecosystem/list': 'ecosystems',
  '/v4/credential-schema/list': 'schemas',
  '/v4/participant/list': 'participants',
  '/v4/corporation/list': 'corporations',
  '/v4/indexer/block-height': 'block-height',
  '/v4/verifiable-trust/dids': 'dids',
}

function validatorChainOf(participantId: number) {
  const participants = read<Participant[]>('participants')
  const byId = new Map(participants.map((p) => [p.id, p]))
  const chain: Participant[] = []
  for (
    let p = byId.get(participantId);
    p;
    p = p.validator_participant_id ? byId.get(p.validator_participant_id) : undefined
  )
    chain.unshift(p)
  return {
    query: 'G1',
    evaluatedAtTime: '2026-10-20T09:49:21.675Z',
    output: chain.map((p) => ({
      id: p.id,
      didId: p.did ?? null,
      role: p.role,
      state: 'ACTIVE',
      credentialSchemaId: p.schema_id,
      ecosystemId: p.ecosystem_id,
      validatorParticipantId: p.validator_participant_id,
    })),
    nextCursor: null,
  }
}

export interface StubOptions {
  resolveStatus?: number
  graphStatus?: number
  holdGraph?: Promise<void>
}

export interface StubCall {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
}

export function stubTrustNetwork({ resolveStatus = 200, graphStatus = 200, holdGraph }: StubOptions = {}) {
  const calls: StubCall[] = []
  const trusted = read<Record<string, unknown>>('resolve-trusted-root')
  const untrusted = read<Record<string, unknown>>('resolve-untrusted')
  const g1 = read<unknown>('graph-traverse-g1')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(input)
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
      calls.push({
        url: input,
        method: init?.method ?? 'GET',
        headers: (init?.headers ?? {}) as Record<string, string>,
        body,
      })
      if (url.pathname === '/v4/verifiable-trust/resolve') {
        if (resolveStatus !== 200) return new Response('resolver exploded', { status: resolveStatus })
        const did = body?.did
        if (did === ECS_DID) return Response.json(trusted)
        if (did === PAPAPO_DID) return Response.json(untrusted)
        return Response.json({ ...untrusted, did, corporationId: null })
      }
      if (url.pathname === '/v4/graph/traverse') {
        await holdGraph
        if (graphStatus !== 200) return new Response('graph down', { status: graphStatus })
        const input = body?.input as { participantId: number }
        return Response.json(input.participantId === 158 ? g1 : validatorChainOf(input.participantId))
      }
      const list = LIST_BODIES[url.pathname]
      if (list) return Response.json(rawBody(list))
      return new Response(`no stub for ${input}`, { status: 404 })
    })
  )
  return calls
}
