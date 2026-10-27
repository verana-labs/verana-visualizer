import { expect, openScene, test } from './support/test'

test.use({ launchOptions: { args: ['--disable-webgl', '--disable-3d-apis', '--disable-gpu'] } })

test('without WebGL the list fallback renders and selects', async ({ page }) => {
  await openScene(page)
  const list = page.getByTestId('list-fallback')
  await expect(list).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(list).toContainText('3D view unavailable')

  await list.getByRole('searchbox', { name: 'Search the network' }).fill('papapo')
  await list.locator('[data-id="participant:158"]').click()
  await expect(page.getByTestId('inspector')).toContainText('Papapo')
})
