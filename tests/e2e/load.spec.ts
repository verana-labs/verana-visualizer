import { expect, openScene, test } from './support/test'

test('loads the scene with no console errors', async ({ page, consoleErrors }) => {
  await openScene(page)
  await expect(page.getByTestId('hud')).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
  await expect(page.getByTestId('live-dot')).toBeVisible()
  expect(consoleErrors).toEqual([])
})

test('the document points at an icon that resolves', async ({ page }) => {
  await openScene(page)
  const href = await page.locator('head link[rel~="icon"]').first().getAttribute('href')
  expect(href).toBeTruthy()
  const response = await page.request.get(new URL(href ?? '', page.url()).toString())
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toMatch(/^image\//)
})

test('the loader shows the Verana logo before the scene appears', async ({ page }) => {
  await page.goto('/')
  const loader = page.getByTestId('stardust-loader')
  await expect(loader).toBeVisible()
  await expect(loader.getByAltText('Verana')).toBeAttached()
  await expect(loader).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByTestId('hud')).toBeVisible()
})

test('streams the stubbed websocket blocks into the HUD', async ({ page }) => {
  await openScene(page)
  await expect(page.getByTestId('hud')).toContainText('96,138')
})
