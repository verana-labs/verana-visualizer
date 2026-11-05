export function safeHttpUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null
  try {
    const { protocol } = new URL(u)
    return protocol === 'http:' || protocol === 'https:' ? u : null
  } catch {
    return null
  }
}
