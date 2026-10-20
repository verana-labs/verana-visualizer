import { expect, openScene, test } from './support/test'

const TOUR_STEPS = 10

test.fixme('Task 19: the tour advances through the intro, 7 lenses, trust check and live core', async ({ page }) => {
  await openScene(page, '?tour=0')
  for (let step = 0; step < TOUR_STEPS; step++) {
    await expect(page).toHaveURL(new RegExp(`tour=${step}(&|$)`))
    if (step < TOUR_STEPS - 1) await page.getByRole('button', { name: /next/i }).click()
  }
  await page.getByRole('button', { name: /done|finish|close/i }).click()
  await expect(page).not.toHaveURL(/tour=/)
})
