import { expect, openScene, test } from './support/test'

const SETTLE_MS = 750
const LENSES = ['Network', 'Trust', 'Economics', 'Chain', 'Time', 'Governance', 'Registry'] as const

const button = (page: Parameters<typeof openScene>[0], label: string) =>
  page.getByRole('button', { name: label, exact: true })

async function switchTo(page: Parameters<typeof openScene>[0], label: string) {
  await button(page, label).click()
  await expect(button(page, label)).toHaveAttribute('aria-pressed', 'true')
  const lens = label.toLowerCase()
  if (lens === 'network') await expect(page).not.toHaveURL(/lens=/)
  else await expect(page).toHaveURL(new RegExp(`[?&]lens=${lens}(&|$)`))
}

test('each of the 7 lenses switches and updates the URL', async ({ page }) => {
  await openScene(page)
  for (const label of LENSES) {
    await switchTo(page, label)
    await page.waitForTimeout(SETTLE_MS)
  }
})

test.fixme('switching from Chain to Time straight away keeps lens=time in the URL', async ({ page }) => {
  await openScene(page)
  await switchTo(page, 'Chain')
  await switchTo(page, 'Time')
})

test('opens directly on the lens named in the URL', async ({ page }) => {
  await openScene(page, '?lens=governance')
  await expect(button(page, 'Governance')).toHaveAttribute('aria-pressed', 'true')
})
