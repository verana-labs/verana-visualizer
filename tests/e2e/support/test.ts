import { test as base, type ConsoleMessage, expect, type Page } from '@playwright/test'

export const MOCK_ORIGIN = `http://127.0.0.1:${process.env.MOCK_PORT ?? 3101}`

const blockMessage = (block: number, events: unknown[]) => ({
  type: 'block',
  block,
  blockTime: '2026-10-20T10:00:00Z',
  events,
})

const event = (block: number, hash: string, did: string) => ({
  type: 'indexer-event',
  event_type: 'CreateNewCorporation',
  did,
  block_height: block,
  tx_hash: hash,
  timestamp: '2026-10-20T10:00:00Z',
  payload: { module: 'co', action: 'create_new_corporation', entity_type: 'Corporation', related_dids: [did] },
})

async function stubSocket(page: Page) {
  await page.routeWebSocket(/\/v4\/indexer\/subscribe$/, (ws) => {
    ws.send(JSON.stringify({ type: 'ready' }))
    ws.onMessage((message) => {
      if (!String(message).includes('subscribe')) return
      ws.send(JSON.stringify(blockMessage(96136, [])))
      ws.send(
        JSON.stringify(
          blockMessage(96137, [
            event(96137, 'AA01', 'did:web:e2e-one.example.org'),
            event(96137, 'AA02', 'did:web:e2e-two.example.org'),
          ])
        )
      )
      ws.send(JSON.stringify(blockMessage(96138, [])))
    })
  })
}

const RESOLVE_URL = /\/v4\/verifiable-trust\/resolve$/

function isUnrecordedAgentResolve(message: ConsoleMessage): boolean {
  return message.text().includes('status of 404') && RESOLVE_URL.test(message.location().url)
}

async function unmatchedRequests(page: Page, reset: boolean): Promise<string[]> {
  const response = await page.request.fetch(`${MOCK_ORIGIN}/__unmatched`, { method: reset ? 'DELETE' : 'GET' })
  return response.json()
}

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() !== 'error' || isUnrecordedAgentResolve(message)) return
        errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(error.message))
      await use(errors)
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await unmatchedRequests(page, true)
    await stubSocket(page)
    await use(page)
    expect(await unmatchedRequests(page, false), 'requests without a recorded fixture').toEqual([])
  },
})

export { expect }

export async function openScene(page: Page, query = '') {
  await page.goto(`/${query}`)
  await expect(page.getByTestId('stardust-loader')).toHaveCount(0, { timeout: 60_000 })
}
