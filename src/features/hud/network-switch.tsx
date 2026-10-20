'use client'

import type { NetworkConfig } from '@/lib/env'

const PEER_NAMES: Record<string, string> = { devnet: 'testnet', testnet: 'devnet' }

function peerName(cfg: NetworkConfig, peerUrl: string): string {
  return PEER_NAMES[cfg.chainName.toLowerCase()] ?? new URL(peerUrl).hostname
}

export function NetworkSwitch({ cfg }: { cfg: NetworkConfig }) {
  if (!cfg.peerVisualizerUrl) return null
  const name = peerName(cfg, cfg.peerVisualizerUrl)
  return (
    <a
      href={`${cfg.peerVisualizerUrl}${window.location.search}`}
      className="rounded-full border border-scene-line px-2.5 py-1 text-[11px] text-scene-mut transition-colors hover:text-white"
    >
      Switch to {name}
    </a>
  )
}
