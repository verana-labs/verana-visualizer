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
  const [at, height, ...rest] = path
  if (at !== 'at' || height === undefined || !HEIGHT.test(height)) {
    return reject('Only /at/<positive block height>/v4/... can be proxied')
  }
  if (rest[0] !== 'v4' || rest.length < 2 || !rest.every(validSegment)) {
    return reject('Only /v4/... indexer paths can be proxied')
  }

  const base = new URL(indexerUrl)
  const target = new URL(`${indexerUrl}/${rest.join('/')}${new URL(request.url).search}`)
  if (target.origin !== base.origin) return reject('The proxy only reaches the configured indexer')

  const response = await upstream(target.toString(), {
    method: 'GET',
    headers: { accept: 'application/json', 'At-Block-Height': height },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return new Response(await response.text(), {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'Cache-Control': response.ok ? 'public, max-age=60' : 'no-store',
      Vary: 'At-Block-Height',
    },
  })
}
