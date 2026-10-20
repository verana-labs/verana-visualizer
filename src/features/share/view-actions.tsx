'use client'

import { useTour } from '@/features/tour/tour-store'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { parseViewState } from '@/lib/view-state'
import { useObservatory } from '@/store/observatory-store'
import { Button } from '@/ui/button'
import { exportPng, pngFileName } from './export-png'
import { sceneHandle } from './scene-handle'
import { shareUrl } from './share-link'

const REVOKE_MS = 10_000

async function copyShareLink() {
  const { lens, selected, showToast } = useObservatory.getState()
  const view = {
    ...parseViewState(new URLSearchParams(window.location.search)),
    lens,
    sel: selected,
    cam: sceneHandle.current?.camera() ?? null,
  }
  try {
    await navigator.clipboard.writeText(shareUrl(window.location.origin, view))
    showToast('Link copied')
  } catch (error) {
    logger.error('Could not copy the share link', error)
    showToast('Could not copy the link')
  }
}

function downloadPng(cfg: NetworkConfig, blockHeight: number) {
  const { showToast } = useObservatory.getState()
  const handle = sceneHandle.current
  if (!handle) {
    showToast('PNG export needs the 3D view')
    return
  }
  const stamp = {
    chainId: cfg.chainId,
    blockHeight,
    at: new Date().toISOString(),
    source: new URL(cfg.indexerUrl).host,
  }
  try {
    const url = URL.createObjectURL(exportPng(handle.capture(), stamp))
    const link = document.createElement('a')
    link.href = url
    link.download = pngFileName(stamp)
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_MS)
  } catch (error) {
    logger.error('PNG export failed', error)
    showToast('PNG export failed')
  }
}

export function ViewActions({ cfg }: { cfg: NetworkConfig }) {
  const ready = useObservatory((s) => s.model !== null)
  const blockHeight = useObservatory((s) => s.blockHeight)
  const small = '!px-2 !py-1.5 flex-1 text-[11.5px]'
  return (
    <div className="flex gap-1.5">
      <Button className={small} disabled={!ready} onClick={() => useTour.getState().present()}>
        Present
      </Button>
      <Button className={small} onClick={() => void copyShareLink()}>
        Share
      </Button>
      <Button
        className={small}
        disabled={blockHeight === null}
        onClick={() => blockHeight !== null && downloadPng(cfg, blockHeight)}
      >
        PNG
      </Button>
    </div>
  )
}
