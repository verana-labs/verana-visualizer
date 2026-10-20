const TIMEOUT_MS = 8000
const SEGMENT = /^[\w.:@-]+$/
const HEIGHT = /^[1-9]\d*$/

type Upstream = (input: string, init?: RequestInit) => Promise<Response>

const reject = (message: string) =>
  Response.json({ error: message }, { status: 400, headers: { 'Cache-Control': 'no-store' } })

const validSegment = (segment: string) => SEGMENT.test(segment) && segment !== '.' && segment !== '..'

export async function proxyIndexer(
  request: Request,
  path: readonly string[],
  indexerUrl: string,
  upstream: Upstream = fetch
): Promise<Response> {
  if (path[0] !== 'v4' || path.length < 2 || !path.every(validSegment)) {
    return reject('Only /v4/... indexer paths can be proxied')
  }
  const height = request.headers.get('At-Block-Height')
  if (height !== null && !HEIGHT.test(height)) return reject('At-Block-Height must be a positive integer')

  const base = new URL(indexerUrl)
  const target = new URL(`${indexerUrl}/${path.join('/')}${new URL(request.url).search}`)
  if (target.origin !== base.origin) return reject('The proxy only reaches the configured indexer')

  const headers: Record<string, string> = { accept: 'application/json' }
  if (height !== null) headers['At-Block-Height'] = height
  const response = await upstream(target.toString(), {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': height !== null && response.ok ? 'public, max-age=60' : 'no-store',
    },
  })
}
