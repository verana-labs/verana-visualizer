import { expect, openScene, test } from './support/test'

const TOUR_STEPS = 10

test('Task 19: the tour advances through the intro, 7 lenses, trust check and live core', async ({ page }) => {
  await openScene(page, '?tour=0')
  for (let step = 0; step < TOUR_STEPS; step++) {
    await expect(page).toHaveURL(new RegExp(`tour=${step}(&|$)`))
    if (step < TOUR_STEPS - 1) await page.getByRole('button', { name: 'Next', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page).not.toHaveURL(/tour=/)
})
