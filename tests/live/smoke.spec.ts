import { expect, type Page, test } from '@playwright/test'

const NETWORK = process.env.NETWORK ?? 'testnet'
const KNOWN_ECS_DIDS: Record<string, string> = {
  testnet: 'did:webvh:QmVEcKodsZWNhMx6UT7Sq4V8JBrcvohdJTutG6q88WQPhQ:ecs-ecosystem.testnet.verana.network',
}
const ECS_DID = process.env.ECS_DID ?? KNOWN_ECS_DIDS[NETWORK]

test.describe(`live smoke on ${NETWORK}`, () => {
  test.skip(!process.env.BASE_URL, 'BASE_URL must point at a running instance')
  test.setTimeout(120_000)

  async function openObservatory(page: Page) {
    await page.goto('/')
    await expect(page.getByTestId('stardust-loader')).toHaveCount(0, { timeout: 90_000 })
  }

  test('entity counts in the HUD are above zero', async ({ page }) => {
    await openObservatory(page)
    const figures = page.getByTestId('hud').getByTestId('figure')
    await expect(figures).toHaveCount(4)
    const ecosystems = Number((await figures.nth(0).innerText()).replace(/,/g, ''))
    const participants = Number((await figures.nth(1).innerText()).replace(/,/g, ''))
    expect(ecosystems).toBeGreaterThan(0)
    expect(participants).toBeGreaterThan(0)
  })

  test('the ECS DID resolves as trusted', async ({ page }) => {
    test.skip(!ECS_DID, `set ECS_DID for ${NETWORK}`)
    await openObservatory(page)
    await page.getByTestId('hud').getByRole('button', { name: 'Is this service trustworthy?' }).click()
    const palette = page.getByRole('dialog', { name: 'Check a service' })
    await palette.getByRole('combobox').fill(ECS_DID ?? '')
    await palette.getByText('Is this service trustworthy?').click()
    await expect(page.getByTestId('trust-result').getByTestId('trust-verdict')).toHaveText('Trusted', {
      timeout: 60_000,
    })
  })

  test('a websocket block arrives within 20 s', async ({ page }) => {
    const received = new Promise<string>((resolve) => {
      page.on('websocket', (socket) => {
        if (!socket.url().endsWith('/v4/indexer/subscribe')) return
        socket.on('framereceived', ({ payload }) => {
          const text = String(payload)
          if (text.includes('"type":"block"')) resolve(text)
        })
      })
    })
    await openObservatory(page)
    const frame = await Promise.race([
      received,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('no block within 20 s')), 20_000)),
    ])
    expect(JSON.parse(frame)).toMatchObject({ type: 'block' })
  })

  test('/health is all green', async ({ page }) => {
    await page.goto('/health')
    const summary = page.getByTestId('health-summary')
    await expect(summary).toBeVisible({ timeout: 90_000 })
    await expect(summary).toHaveText(/^all \d+ passing/)
  })
})
