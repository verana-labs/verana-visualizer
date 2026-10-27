import { expect, test } from './support/test'

const REDIRECTS: [string, string][] = [
  ['/did-directory?did=did:web:x', '/?sel=agent:did%3Aweb%3Ax'],
  ['/did-directory?controller=verana1abc', '/?q=verana1abc'],
  ['/did-directory', '/'],
  ['/permissions?permission=158', '/?sel=participant:158'],
  ['/permissions', '/'],
  ['/dashboard', '/?lens=chain'],
  ['/trust-registries', '/?lens=network'],
  ['/network-graph', '/'],
  ['/governance', '/?lens=governance'],
  ['/governance/12', '/?lens=governance&sel=proposal:12'],
  ['/ecosystem', '/?lens=registry'],
  ['/developer-activity', '/'],
  ['/e/participant/158', '/?sel=participant:158'],
  ['/e/schema/7', '/?sel=schema:7'],
  ['/e/did/did:web:x', '/?sel=agent:did%3Aweb%3Ax'],
  ['/e/bogus/1', '/'],
]

for (const [from, to] of REDIRECTS) {
  test(`redirects ${from} to ${to}`, async ({ request }) => {
    const response = await request.get(from, { maxRedirects: 0 })
    expect([307, 308]).toContain(response.status())
    const location = new URL(response.headers().location ?? '', 'http://localhost')
    expect(`${location.pathname}${location.search}`).toBe(to)
  })
}

test('a legacy permission link lands on the participant in the observatory', async ({ page }) => {
  await page.goto('/permissions?permission=158')
  await expect(page).toHaveURL(/sel=participant:158/)
  await expect(page.getByTestId('stardust-loader')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByTestId('inspector')).toContainText('Papapo')
})

test('a legacy controller link opens search on the corporation that account controls', async ({ page }) => {
  const account = 'verana1yp38kfyr2wmccyqryqggpmpmq09ur9wy48ksqw6x824n4la83jrstlhfcj'
  await page.goto(`/did-directory?controller=${account}`)
  await expect(page.getByTestId('stardust-loader')).toHaveCount(0, { timeout: 60_000 })
  const dialog = page.getByRole('dialog', { name: 'Search' })
  await expect(dialog.getByRole('combobox')).toHaveValue(account)
  await expect(dialog.getByRole('option').first()).toContainText('Corporation #34')
  await expect(page).not.toHaveURL(/q=/)
})

test('the indexer proxy serves a pinned-height read from the indexer', async ({ request }) => {
  const response = await request.get('/api/indexer/at/38000/v4/indexer/changes')
  expect(response.status()).toBe(200)
  expect(await response.json()).toMatchObject({ block_height: 38000, next_change_at: 38257 })
})

test('the indexer proxy refuses paths that are not /v4', async ({ request }) => {
  const response = await request.get('/api/indexer/at/38000/admin/secrets')
  expect(response.status()).toBe(400)
})
