import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('next.config', () => {
  it('does not advertise the framework', () => {
    expect(nextConfig.poweredByHeader).toBe(false)
  })

  it('sends basic security headers on every route, refusing to be framed', async () => {
    const rules = (await nextConfig.headers?.()) ?? []
    const all = rules.find((rule) => rule.source === '/:path*')
    const headers = Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]))
    expect(headers).toMatchObject({
      'Content-Security-Policy': "frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    })
  })
})
