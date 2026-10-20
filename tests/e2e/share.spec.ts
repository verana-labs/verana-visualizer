import { expect, openScene, test } from './support/test'

test('a shared URL restores the lens and the selection', async ({ page }) => {
  await openScene(page, '?lens=registry&sel=participant:158')
  await expect(page.getByRole('button', { name: 'Registry', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('inspector')).toContainText('Papapo')
  await expect(page).toHaveURL(/lens=registry/)
  await expect(page).toHaveURL(/sel=participant:158/)
})

test.fixme('Task 19: the share button copies a link that restores lens and selection', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openScene(page, '?lens=registry&sel=participant:158')
  await page.getByRole('button', { name: /share/i }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toBe(`${new URL(page.url()).origin}/?lens=registry&sel=participant:158`)

  await page.goto(link)
  await expect(page.getByTestId('stardust-loader')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Registry', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('inspector')).toContainText('Papapo')
})
