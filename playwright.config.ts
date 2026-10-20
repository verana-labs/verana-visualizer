import { defineConfig, devices } from '@playwright/test'

const port = 3100
const mockPort = 3101
const mock = `http://127.0.0.1:${mockPort}`
const liveBaseUrl = process.env.BASE_URL

export default defineConfig({
  testDir: './tests',
  testMatch: ['e2e/**/*.spec.ts', 'live/**/*.spec.ts'],
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: liveBaseUrl ?? `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
      },
    },
  ],
  webServer: liveBaseUrl
    ? undefined
    : [
        {
          command: 'pnpm exec tsx tests/e2e/support/mock-server.ts',
          url: `${mock}/__unmatched`,
          env: { MOCK_PORT: String(mockPort) },
          reuseExistingServer: !process.env.CI,
        },
        {
          command: `pnpm exec next start --port ${port}`,
          url: `http://localhost:${port}`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: mock,
            NEXT_PUBLIC_VERANA_GRAPH_URL: mock,
            NEXT_PUBLIC_VERANA_REST_ENDPOINT: mock,
            NEXT_PUBLIC_VERANA_RPC_ENDPOINT: mock,
            NEXT_PUBLIC_VERANA_FRONTEND_URL: 'https://app.testnet.verana.network',
            NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
            NEXT_PUBLIC_VERANA_CHAIN_NAME: 'testnet',
          },
        },
      ],
})
