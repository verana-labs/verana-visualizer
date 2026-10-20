import { useLayoutEffect, useState } from 'react'

const HUD_GAP = 12
const FALLBACK_TOP = 248
export const FOOTER_SPACE = 66

export function useBelowHud(): number {
  const [top, setTop] = useState(FALLBACK_TOP)
  useLayoutEffect(() => {
    const hud = document.querySelector<HTMLElement>('[data-testid="hud"]')
    if (!hud) return
    const update = () => setTop(Math.round(hud.getBoundingClientRect().bottom) + HUD_GAP)
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(hud)
    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])
  return top
}
