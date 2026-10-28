import type { ComponentProps } from 'react'
import { GlassPanel } from './glass-panel'
import { useBelowHud } from './use-below-hud'

const FOOTER_SPACE = 66

export function LensPanel(props: Pick<ComponentProps<'div'>, 'role' | 'aria-label' | 'children'>) {
  const top = useBelowHud()
  return (
    <GlassPanel
      {...props}
      style={{ top, maxHeight: `calc(100vh - ${top + FOOTER_SPACE}px)` }}
      className="fixed left-4 z-10 w-[330px] max-w-[calc(100vw-32px)] overflow-y-auto p-4 text-scene-txt"
    />
  )
}
