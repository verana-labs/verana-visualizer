'use client'

import { useEffect, useState } from 'react'
import type { FeedItem } from '@/domain/activity'
import type { NetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { Button } from '@/ui/button'
import { Chip } from '@/ui/chip'
import { GlassPanel } from '@/ui/glass-panel'
import { relativeAge } from './activity'
import { useIndexerReplay, useLiveActivity } from './live-activity'
import type { ReplayState } from './replay'

const AGE_REFRESH_MS = 30_000

const number = (n: number) => n.toLocaleString('en-US')

function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), AGE_REFRESH_MS)
    return () => clearInterval(id)
  }, [])
  return now
}

function replayStatus(state: ReplayState): string | null {
  switch (state.status) {
    case 'searching':
      return 'Searching past blocks…'
    case 'running':
      return `Replaying events from block ${number(state.from)}–${number(state.to)}`
    case 'empty':
      return 'No events found'
    case 'failed':
      return `Replay failed: ${state.message}`
    default:
      return null
  }
}

function FeedRow({ item, now }: { item: FeedItem; now: number }) {
  const age = relativeAge(item.timestamp, now)
  return (
    <li className="flex items-baseline gap-2 border-b border-scene-line py-1.5 text-xs last:border-b-0 motion-safe:animate-[feed-in_.5s_ease-out]">
      <span aria-hidden style={{ color: item.touched ? item.color : 'var(--scene-mut, #8b8aa0)' }}>
        ●
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate">{item.name}</span>
          {item.module && (
            <Chip
              className="!px-1.5 !py-0 !text-[10px]"
              style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 16%, transparent)` }}
            >
              {item.module}
            </Chip>
          )}
        </span>
        {item.where && <span className="block truncate text-[10.5px] text-scene-mut">{item.where}</span>}
      </span>
      <span className="whitespace-nowrap text-[10.5px] text-scene-mut">
        {age ? `block ${number(item.block)} · ${age}` : `block ${number(item.block)}`}
      </span>
    </li>
  )
}

export function ActivityFeed({ cfg }: { cfg: NetworkConfig }) {
  useLiveActivity(cfg)
  const feed = useObservatory((s) => s.feed)
  const blockHeight = useObservatory((s) => s.blockHeight)
  const collapsed = useObservatory((s) => s.selected !== null || s.trustCheck !== null)
  const besidePanel = useObservatory((s) => s.lens !== 'network' && s.lens !== 'trust')
  const now = useNow()
  const replay = useIndexerReplay(cfg)
  const busy = replay.state.status === 'searching' || replay.state.status === 'running'
  const status = replayStatus(replay.state)

  return (
    <GlassPanel
      role="region"
      aria-label="Live activity"
      className={`fixed right-4 bottom-[66px] z-10 w-[340px] max-w-[calc(100vw-32px)] px-3.5 py-3 text-scene-txt ${besidePanel ? 'max-md:hidden' : ''}`}
    >
      <div className={`flex items-center justify-between gap-2 ${collapsed ? '' : 'mb-1'}`}>
        <span className="text-[10px] uppercase tracking-[.09em] text-scene-mut">live activity</span>
        <span className="flex gap-1.5">
          {busy && (
            <Button className="!px-2 !py-1 text-[11px]" onClick={replay.cancel}>
              Cancel replay
            </Button>
          )}
          <Button
            className="!px-2 !py-1 text-[11px]"
            disabled={busy || blockHeight === null}
            onClick={() => void replay.start()}
          >
            Replay recent
          </Button>
        </span>
      </div>
      {!collapsed && status && (
        <div role="status" className="py-1 text-[10.5px] text-scene-mut">
          {status}
        </div>
      )}
      {collapsed ? null : feed.length > 0 ? (
        <ul>
          {feed.map((item) => (
            <FeedRow key={item.key} item={item} now={now} />
          ))}
        </ul>
      ) : (
        <p className="py-1.5 text-[11px] text-scene-mut">Transactions appear here as they land on chain.</p>
      )}
    </GlassPanel>
  )
}
