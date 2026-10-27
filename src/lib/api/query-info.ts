export interface QueryInfo {
  method: 'GET' | 'POST'
  url: string
  headers: Record<string, string>
  body?: unknown
}

export interface Fetched<T> {
  data: T
  query: QueryInfo
}

function quote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

export function toCurl(q: QueryInfo): string {
  const parts = ['curl']
  if (q.method !== 'GET') parts.push('-X', q.method)
  parts.push(quote(q.url))
  for (const [name, value] of Object.entries(q.headers)) parts.push('-H', quote(`${name}: ${value}`))
  if (q.body !== undefined) parts.push('-d', quote(JSON.stringify(q.body)))
  return parts.join(' ')
}
