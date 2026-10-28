import { expect, openScene, test } from './support/test'

test('a shared URL restores the lens and the selection', async ({ page }) => {
  await openScene(page, '?lens=registry&sel=participant:158')
  await expect(page.getByRole('button', { name: 'Registry', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('inspector')).toContainText('Papapo')
  await expect(page).toHaveURL(/lens=registry/)
  await expect(page).toHaveURL(/sel=participant:158/)
})

test('the share button copies a link that restores lens and selection', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openScene(page, '?lens=registry&sel=participant:158')
  await page.getByRole('button', { name: 'Share', exact: true }).click()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  const origin = new URL(page.url()).origin
  expect(link.startsWith(`${origin}/?lens=registry&sel=participant:158&cam=`)).toBe(true)
  expect(new URL(link).searchParams.get('cam')?.split(',')).toHaveLength(6)

  await page.goto(link)
  await expect(page.getByTestId('stardust-loader')).toHaveCount(0, { timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Registry', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('inspector')).toContainText('Papapo')
})
