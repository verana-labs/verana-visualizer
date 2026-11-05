import type { z } from 'zod'

export class FetchError extends Error {
  readonly url: string
  readonly status: number | null
  readonly body: string | null

  constructor(message: string, details: { url: string; status: number | null; body: string | null }) {
    super(message)
    this.name = 'FetchError'
    this.url = details.url
    this.status = details.status
    this.body = details.body
  }
}

function describeIssue(error: z.ZodError): string {
  const issue = error.issues[0]
  const path = issue.path.length > 0 ? issue.path.map(String).join('.') : '(root)'
  return `${path}: ${issue.message}`
}

export async function fetchJson<T>(url: string, init: RequestInit | undefined, schema: z.ZodType<T>): Promise<T> {
  const method = init?.method ?? 'GET'

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new FetchError(`${method} ${url} failed: ${reason}`, { url, status: null, body: null })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => null)
    throw new FetchError(`${method} ${url} failed with status ${response.status}`, {
      url,
      status: response.status,
      body,
    })
  }

  const text = await response.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new FetchError(`${method} ${url} returned a body that is not valid JSON: ${reason}`, {
      url,
      status: response.status,
      body: text.slice(0, 2000),
    })
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) {
    throw new FetchError(`${method} ${url} returned an unexpected shape at ${describeIssue(parsed.error)}`, {
      url,
      status: response.status,
      body: text.slice(0, 2000),
    })
  }
  return parsed.data
}
