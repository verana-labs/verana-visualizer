import { logger } from '@/lib/logger'

const TIMEOUT_MS = 8000
const MAX_BODY_BYTES = 5 * 1024 * 1024
const SEGMENT = /^[\w.:@-]+$/
const HEIGHT = /^[1-9]\d*$/
const BODYLESS = new Set([204, 304])
const HARDENING = { 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox' }

type Upstream = (input: string, init?: RequestInit) => Promise<Response>

const failure = (status: 400 | 502, message: string) =>
  Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store', ...HARDENING } })

const validSegment = (segment: string) => SEGMENT.test(segment) && segment !== '.' && segment !== '..'

async function cappedBody(response: Response): Promise<ArrayBuffer | null> {
  const declared = Number(response.headers.get('content-length'))
  if (declared > MAX_BODY_BYTES) return null
  const body = await response.arrayBuffer()
  return body.byteLength > MAX_BODY_BYTES ? null : body
}

export async function proxyIndexer(
  request: Request,
  path: readonly string[],
  indexerUrl: string,
  upstream: Upstream = fetch
): Promise<Response> {
  const [at, height, ...rest] = path
  if (at !== 'at' || height === undefined || !HEIGHT.test(height)) {
    return failure(400, 'Only /at/<positive block height>/v4/... can be proxied')
  }
  if (rest[0] !== 'v4' || rest.length < 2 || !rest.every(validSegment)) {
    return failure(400, 'Only /v4/... indexer paths can be proxied')
  }

  const root = indexerUrl.replace(/\/+$/, '')
  const target = new URL(`${root}/${rest.join('/')}${new URL(request.url).search}`)
  if (target.origin !== new URL(root).origin) return failure(400, 'The proxy only reaches the configured indexer')

  let response: Response
  let body: ArrayBuffer | null
  try {
    response = await upstream(target.toString(), {
      method: 'GET',
      headers: { accept: 'application/json', 'At-Block-Height': height },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    body = BODYLESS.has(response.status) ? null : await cappedBody(response)
  } catch (error) {
    logger.error(`Indexer proxy could not reach ${target.pathname} at block ${height}`, error)
    return failure(502, 'The indexer could not be reached')
  }
  if (body === null && !BODYLESS.has(response.status)) {
    return failure(502, 'The indexer response is larger than the proxy allows')
  }

  return new Response(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': response.ok ? 'public, max-age=60' : 'no-store',
      Vary: 'At-Block-Height',
      ...HARDENING,
    },
  })
}
