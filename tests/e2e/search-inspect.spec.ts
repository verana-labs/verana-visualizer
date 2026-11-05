import { expect, openScene, test } from './support/test'

test('search, select and inspect a participant', async ({ page }) => {
  await openScene(page)
  await page.keyboard.press('/')
  const palette = page.getByRole('dialog', { name: 'Search' })
  await expect(palette).toBeVisible()
  await palette.getByRole('combobox').fill('papapo')
  await palette.locator('[cmdk-item][data-value="participant:158"]').click()

  const inspector = page.getByTestId('inspector')
  await expect(inspector).toBeVisible()
  await expect(inspector).toContainText('Papapo')
  await expect(inspector).toContainText(/participant/i)
  await expect(page).toHaveURL(/sel=participant:158/)
  await expect(palette).toHaveCount(0)
})

test('Escape closes the inspector and clears the selection', async ({ page }) => {
  await openScene(page, '?sel=participant:158')
  await expect(page.getByTestId('inspector')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('inspector')).toHaveCount(0)
  await expect(page).not.toHaveURL(/sel=/)
})
