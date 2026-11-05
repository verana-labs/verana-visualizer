import type { Page } from '@playwright/test'
import { ECS_DID, PAPAPO_DID } from '../support/network'
import { expect, openScene, test } from './support/test'

async function checkDid(page: Page, did: string) {
  await page.getByTestId('hud').getByRole('button', { name: 'Is this service trustworthy?' }).click()
  const palette = page.getByRole('dialog', { name: 'Check a service' })
  await palette.getByRole('combobox').fill(did)
  await palette.getByText('Is this service trustworthy?').click()
}

test('the papapo DID is not trusted and has a verdict card', async ({ page }) => {
  await openScene(page)
  await checkDid(page, PAPAPO_DID)

  const result = page.getByTestId('trust-result')
  await expect(result.getByTestId('trust-verdict')).toHaveText('Not trusted')
  await expect(result).toContainText(PAPAPO_DID)

  const card = result.getByRole('link', { name: /Open verdict card/ })
  const href = await card.getAttribute('href')
  expect(href).toContain('/verdict/')
  await page.goto(href ?? '')
  await expect(page.getByTestId('verdict-card')).toBeVisible()
  await expect(page.getByTestId('trust-verdict')).toHaveText('Not trusted')
  await expect(page.getByTestId('verdict-card')).toContainText(PAPAPO_DID)
})

test('the ECS ecosystem DID is trusted', async ({ page }) => {
  await openScene(page)
  await checkDid(page, ECS_DID)
  await expect(page.getByTestId('trust-result').getByTestId('trust-verdict')).toHaveText('Trusted')
})

test('/verdict/[did] renders server-side from the indexer', async ({ page }) => {
  await page.goto(`/verdict/${encodeURIComponent(PAPAPO_DID)}`)
  await expect(page.getByTestId('verdict-card')).toBeVisible()
  await expect(page.getByTestId('trust-verdict')).toHaveText('Not trusted')
  await expect(page.getByTestId('raw-json')).toContainText('"trusted": false')
})

test('/verdict/[did] rejects an invalid block parameter', async ({ page }) => {
  await page.goto(`/verdict/${encodeURIComponent(PAPAPO_DID)}?block=abc`)
  await expect(page.getByRole('heading', { name: 'Invalid block parameter' })).toBeVisible()
})
