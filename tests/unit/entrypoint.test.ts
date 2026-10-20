import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SCRIPT = join(process.cwd(), 'entrypoint.sh')

const REQUIRED = {
  NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
  NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
  NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
  NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
}

const run = (env: Record<string, string>) =>
  spawnSync('sh', [SCRIPT, 'echo', 'started'], { env: { PATH: process.env.PATH ?? '', ...env }, encoding: 'utf8' })

describe('entrypoint.sh', () => {
  it('starts the command when every required variable is set', () => {
    const result = run(REQUIRED)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('started')
  })

  it('refuses to start without a chain id', () => {
    const { NEXT_PUBLIC_VERANA_CHAIN_ID: _id, ...rest } = REQUIRED
    const result = run(rest)
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('NEXT_PUBLIC_VERANA_CHAIN_ID (or legacy NEXT_PUBLIC_CHAIN_ID) is required')
  })

  it('treats a whitespace-only value as missing', () => {
    const result = run({ ...REQUIRED, NEXT_PUBLIC_VERANA_RPC_ENDPOINT: '   ' })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('NEXT_PUBLIC_VERANA_RPC_ENDPOINT (or legacy NEXT_PUBLIC_RPC_ENDPOINT) is required')
  })
})
