import { defineConfig, devices } from '@playwright/test'

const port = 3102
const DEFAULT_GL = '--use-gl=angle --enable-gpu --ignore-gpu-blocklist'

export default defineConfig({
  testDir: '.',
  testMatch: 'perf.spec.ts',
  timeout: 180_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    {
      name: 'perf',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: { args: (process.env.PERF_GL_ARGS ?? DEFAULT_GL).split(' ') },
      },
    },
  ],
  webServer: {
    command: `pnpm exec next start --port ${port}`,
    url: `http://localhost:${port}/perf`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
      NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
      NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
      NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
    },
  },
})
