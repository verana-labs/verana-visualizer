import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface RawFixture {
  method: string
  path: string
  query: string
  height: string | null
  body: unknown
  status: number
  response: unknown
}

export interface Match {
  status: number
  body: unknown
}

const RAW_DIR = join(__dirname, '..', '..', 'fixtures', 'testnet', 'raw')
const QUERY_AGNOSTIC = new Set(['/v4/stats/stats', '/v4/indexer/events'])
const TOLERATED_404 = [
  /^\/cosmos\/base\/tendermint\/v1beta1\/blocks\/\d+$/,
  /^\/cosmos\/auth\/v1beta1\/module_accounts\//,
  /^\/v4\/group\/get\/\d+$/,
  /^\/v4\/trust-deposit\/get\/\d+$/,
  /^\/v4\/graph\/traverse$/,
]
const CHANGES_PATH = '/v4/indexer/changes'
const PARTICIPANTS_PATH = '/v4/participant/list'
const RESOLVE_PATH = '/v4/verifiable-trust/resolve'
const UNTRUSTED_FIXTURE_DID = 'did:webvh:QmbMzijTyACD4RgPscJmifpH4BXXCVq9yYjn36jcBntdDv:verana.papapo.shoes'

function sortedQuery(search: string): string {
  return [...new URLSearchParams(search).entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('&')
}

function heightOf(headers: Record<string, string | string[] | undefined>): string | null {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'at-block-height') return String(Array.isArray(value) ? value[0] : value)
  }
  return null
}

function load(): RawFixture[] {
  return readdirSync(RAW_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const raw = JSON.parse(readFileSync(join(RAW_DIR, file), 'utf8'))
      const url = new URL(raw.request.url)
      return {
        method: raw.request.method,
        path: url.pathname,
        query: sortedQuery(url.search),
        height: heightOf(raw.request.headers ?? {}),
        body: raw.request.body ?? null,
        status: raw.status,
        response: raw.body,
      }
    })
}

const FIXTURES = load()

export function matchFixture(
  method: string,
  url: string,
  headers: Record<string, string | string[] | undefined>,
  body: unknown
): Match | null {
  const { pathname, search } = new URL(url, 'http://mock.invalid')
  const query = sortedQuery(search)
  const height = heightOf(headers)
  const wantedBody = JSON.stringify(body ?? null)
  const pick = (ignoreHeight: boolean) => {
    const candidates = FIXTURES.filter(
      (f) =>
        f.method === method &&
        f.path === pathname &&
        (ignoreHeight || f.height === height) &&
        JSON.stringify(f.body) === wantedBody
    )
    const exact = candidates.find((f) => f.query === query)
    return exact ?? (QUERY_AGNOSTIC.has(pathname) && candidates.length === 1 ? candidates[0] : undefined)
  }
  const pinnedReplay = height !== null && method === 'GET' && pathname !== CHANGES_PATH
  const found = pick(false) ?? (pinnedReplay ? pick(true) : undefined)
  if (found) return { status: found.status, body: found.response }
  if (method === 'POST' && pathname === RESOLVE_PATH) return untrustedResolve(body)
  if (method === 'GET' && pathname === PARTICIPANTS_PATH) return filteredParticipants(new URLSearchParams(search))
  return null
}

function filteredParticipants(params: URLSearchParams): Match | null {
  const did = params.get('did')
  const id = params.get('participant_id')
  if (did === null && id === null) return null
  const all = FIXTURES.find((f) => f.method === 'GET' && f.path === PARTICIPANTS_PATH && f.height === null)
  const body = all?.response as { participants?: { id: number; did?: string }[] } | undefined
  if (!all || !body?.participants) return null
  const participants = body.participants.filter(
    (p) => (did === null || p.did === did) && (id === null || String(p.id) === id)
  )
  return { status: all.status, body: { ...body, participants } }
}

function untrustedResolve(body: unknown): Match | null {
  const did = (body as { did?: unknown } | null)?.did
  const base = FIXTURES.find(
    (f) => f.path === RESOLVE_PATH && JSON.stringify(f.body) === JSON.stringify({ did: UNTRUSTED_FIXTURE_DID })
  )
  if (typeof did !== 'string' || !base) return null
  return { status: base.status, body: JSON.parse(JSON.stringify(base.response).replaceAll(UNTRUSTED_FIXTURE_DID, did)) }
}

export function isTolerated404(url: string): boolean {
  const { pathname } = new URL(url, 'http://mock.invalid')
  return TOLERATED_404.some((pattern) => pattern.test(pathname))
}
