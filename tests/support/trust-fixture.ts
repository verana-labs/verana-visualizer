import { vi } from 'vitest'
import type { Participant } from '@/lib/api/schemas'
import { ECS_DID, PAPAPO_DID } from './network'
import { rawBody, recorded } from './recorded'

const LIST_BODIES: Record<string, string> = {
  '/v4/ecosystem/list': 'ecosystems',
  '/v4/credential-schema/list': 'schemas',
  '/v4/participant/list': 'participants',
  '/v4/corporation/list': 'corporations',
  '/v4/indexer/block-height': 'block-height',
  '/v4/verifiable-trust/dids': 'dids',
}

function validatorChainOf(participantId: number) {
  const participants = recorded<Participant[]>('participants')
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
  hangLists?: boolean
  resolveDid?: string
}

export interface StubCall {
  url: string
  method: string
  headers: Record<string, string>
  body: unknown
  signal: AbortSignal | null
}

const hangUntilAborted = (signal: AbortSignal | null | undefined) =>
  new Promise<Response>((_, reject) => {
    signal?.addEventListener('abort', () => reject(signal.reason))
  })

function listBody(url: URL): unknown {
  const name = LIST_BODIES[url.pathname]
  const body = rawBody(name)
  if (url.pathname !== '/v4/participant/list') return body
  const did = url.searchParams.get('did')
  const id = url.searchParams.get('participant_id')
  const all = (body as { participants: Participant[] }).participants
  return {
    participants: all.filter((p) => (did === null || p.did === did) && (id === null || String(p.id) === id)),
  }
}

export function stubTrustNetwork({
  resolveStatus = 200,
  graphStatus = 200,
  holdGraph,
  hangLists = false,
  resolveDid,
}: StubOptions = {}) {
  const calls: StubCall[] = []
  const trusted = recorded<Record<string, unknown>>('resolve-trusted-root')
  const untrusted = recorded<Record<string, unknown>>('resolve-untrusted')
  const g1 = rawBody('graph-traverse-g1')
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
        signal: init?.signal ?? null,
      })
      if (url.pathname === '/v4/verifiable-trust/resolve') {
        if (resolveStatus !== 200) return new Response('resolver exploded', { status: resolveStatus })
        const did = resolveDid ?? body?.did
        if (did === ECS_DID && !resolveDid) return Response.json(trusted)
        if (did === PAPAPO_DID && !resolveDid) return Response.json(untrusted)
        return Response.json({ ...untrusted, did, corporationId: null })
      }
      if (url.pathname === '/v4/graph/traverse') {
        await holdGraph
        if (graphStatus !== 200) return new Response('graph down', { status: graphStatus })
        const input = body?.input as { participantId: number }
        return Response.json(input.participantId === 158 ? g1 : validatorChainOf(input.participantId))
      }
      if (LIST_BODIES[url.pathname]) {
        if (hangLists) return hangUntilAborted(init?.signal)
        return Response.json(listBody(url))
      }
      return new Response(`no stub for ${input}`, { status: 404 })
    })
  )
  return calls
}
