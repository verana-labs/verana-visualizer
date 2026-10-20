import { expect, type Page, test } from '@playwright/test'

const WARMUP_MS = 5000
const MEASURE_MS = 10_000
const MIN_FPS = 30

async function measureFps(page: Page): Promise<number> {
  return page.evaluate(
    (duration) =>
      new Promise<number>((resolve) => {
        let frames = 0
        const start = performance.now()
        const tick = () => {
          frames++
          const elapsed = performance.now() - start
          if (elapsed < duration) requestAnimationFrame(tick)
          else resolve((frames * 1000) / elapsed)
        }
        requestAnimationFrame(tick)
      }),
    MEASURE_MS
  )
}

for (const participants of [5000, 157]) {
  test(`renders ${participants} participants at ${MIN_FPS} fps or more`, async ({ page }) => {
    await page.goto(`/perf?participants=${participants}`)
    await expect(page.getByTestId('perf-harness')).toHaveAttribute('data-participants', String(participants))
    await expect(page.locator('[data-testid="observatory-canvas"] canvas')).toBeVisible({ timeout: 60_000 })
    await page.waitForTimeout(WARMUP_MS)
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      const info = gl?.getExtension('WEBGL_debug_renderer_info')
      return info && gl ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown'
    })
    const fps = await measureFps(page)
    test.info().annotations.push({ type: 'fps', description: `${participants} participants: ${fps.toFixed(1)} fps` })
    console.log(`perf: ${participants} participants, ${fps.toFixed(1)} fps over ${MEASURE_MS / 1000} s on ${renderer}`)
    expect(fps).toBeGreaterThanOrEqual(MIN_FPS)
  })
}
