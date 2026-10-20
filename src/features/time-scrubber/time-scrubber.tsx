'use client'

import { useMemo } from 'react'
import type { NetworkModel } from '@/domain/network-model'
import { countedParticipants } from '@/features/inspector/entity-facts'
import { ShowQuery } from '@/features/inspector/show-query'
import type { QueryInfo } from '@/lib/api/query-info'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'
import type { DayMark, DensityPoint } from './timeline'

const BINS = 240
const STRIP_H = 28
const MAX_DAY_LABELS = 8

export type SnapshotView =
  | { status: 'loading'; height: number }
  | { status: 'ready'; height: number; model: NetworkModel; time: string | null; query: QueryInfo; missing: number }
  | { status: 'error'; height: number; message: string }

export interface TimeScrubberProps {
  head: number
  height: number
  density: DensityPoint[]
  days: DayMark[]
  historyStatus: 'pending' | 'error' | 'success'
  historyError: string | null
  snapshot: SnapshotView
  playing: boolean
  jumping: boolean
  notice: string | null
  onScrub(height: number): void
  onPlay(): void
  onPause(): void
  onJump(): void
  onLive(): void
}

const number = (n: number) => n.toLocaleString('en-US')
const plural = (n: number, word: string) => `${number(n)} ${word}${n === 1 ? '' : 's'}`

export function formatBlockTime(time: string): string {
  return `${new Date(time).toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'medium' })} UTC`
}

function bins(density: DensityPoint[], head: number): number[] {
  const out = new Array<number>(BINS).fill(0)
  const span = Math.max(1, head - 1)
  for (const point of density) {
    if (point.height > head) continue
    out[Math.min(BINS - 1, Math.floor(((point.height - 1) / span) * BINS))] += point.count
  }
  return out
}

function DensityStrip({
  density,
  days,
  head,
  height,
}: Pick<TimeScrubberProps, 'density' | 'days' | 'head' | 'height'>) {
  const bars = useMemo(
    () => bins(density, head).flatMap((count, x) => (count === 0 ? [] : [{ x, count }])),
    [density, head]
  )
  const max = Math.max(1, ...bars.map((bar) => bar.count))
  const pct = (h: number) => `${((h - 1) / Math.max(1, head - 1)) * 100}%`
  const step = Math.max(1, Math.ceil(days.length / MAX_DAY_LABELS))
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg
        data-testid="density-strip"
        viewBox={`0 0 ${BINS} ${STRIP_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        {bars.map((bar) => {
          const h = Math.max(2, Math.sqrt(bar.count / max) * STRIP_H)
          return (
            <rect key={bar.x} x={bar.x} width={0.8} y={STRIP_H - h} height={h} fill="var(--accent)" opacity={0.75} />
          )
        })}
      </svg>
      {days.map((day, i) => (
        <div key={day.date} className="absolute inset-y-0 border-l border-scene-line" style={{ left: pct(day.height) }}>
          {i % step === 0 && (
            <span className="absolute -top-[15px] left-1 whitespace-nowrap text-[9.5px] text-scene-mut">
              {day.date.slice(5)}
            </span>
          )}
        </div>
      ))}
      <div className="absolute inset-y-[-3px] w-px bg-white shadow-[0_0_6px_#fff]" style={{ left: pct(height) }} />
    </div>
  )
}

function SnapshotLine({ snapshot }: { snapshot: SnapshotView }) {
  if (snapshot.status === 'loading')
    return <span className="text-scene-mut">Reading block {number(snapshot.height)}…</span>
  if (snapshot.status === 'error')
    return (
      <span className="text-[#ff6b8b]">
        Snapshot at block {number(snapshot.height)} unavailable: {snapshot.message}
      </span>
    )
  const { model } = snapshot
  return (
    <span className="truncate text-scene-mut">
      {plural(model.ecosystems.length, 'ecosystem')} · {plural(model.raw.schemas.length, 'schema')} ·{' '}
      {plural(countedParticipants(model, model.participants), 'participant')} · {plural(model.agents.length, 'DID')}
    </span>
  )
}

export function TimeScrubber(props: TimeScrubberProps) {
  const { head, height, snapshot, playing, jumping, notice } = props
  const time = snapshot.status === 'ready' ? snapshot.time : null
  return (
    <GlassPanel
      aria-label="Time scrubber"
      className="fixed bottom-[62px] left-4 right-4 z-10 px-3.5 pb-2.5 pt-2.5 text-scene-txt md:right-[372px]"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
        {playing ? (
          <Button className="!px-2.5 !py-1 text-[11px]" onClick={props.onPause}>
            Pause
          </Button>
        ) : (
          <Button className="!px-2.5 !py-1 text-[11px]" onClick={props.onPlay}>
            Play
          </Button>
        )}
        <Button className="!px-2.5 !py-1 text-[11px]" disabled={jumping || height >= head} onClick={props.onJump}>
          Next event
        </Button>
        <span className="font-medium tabular-nums" data-testid="time-block">
          Block {number(height)}
        </span>
        <span className="tabular-nums text-scene-mut" data-testid="time-date">
          {snapshot.status === 'ready' ? (time ? formatBlockTime(time) : 'date unavailable') : '…'}
        </span>
        <SnapshotLine snapshot={snapshot} />
        <span className="ml-auto flex items-center gap-2">
          {notice && (
            <span role="status" className="text-[10.5px] text-scene-mut">
              {notice}
            </span>
          )}
          <Button className="!px-2.5 !py-1 text-[11px]" disabled={height >= head} onClick={props.onLive}>
            Live
          </Button>
        </span>
      </div>
      <div className="relative mt-5 h-7">
        {props.historyStatus === 'success' && (
          <DensityStrip density={props.density} days={props.days} head={head} height={height} />
        )}
        {props.historyStatus === 'pending' && (
          <span className="absolute inset-0 flex items-center text-[10.5px] text-scene-mut">
            Reading the event history…
          </span>
        )}
        {props.historyStatus === 'error' && (
          <span className="absolute inset-0 flex items-center text-[10.5px] text-[#ff6b8b]">
            Event history unavailable: {props.historyError}
          </span>
        )}
        <input
          type="range"
          aria-label="Block height"
          min={1}
          max={head}
          step={1}
          value={height}
          onChange={(event) => props.onScrub(Number(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      {snapshot.status === 'ready' && snapshot.missing > 0 && (
        <p role="note" className="mt-1.5 text-[10.5px] text-[#fbbf24]">
          {number(snapshot.missing)} {snapshot.missing === 1 ? 'entity' : 'entities'} existing at block {number(height)}{' '}
          {snapshot.missing === 1 ? 'is' : 'are'} no longer on chain and {snapshot.missing === 1 ? "isn't" : "aren't"}{' '}
          drawn
        </p>
      )}
      {snapshot.status === 'ready' && <ShowQuery query={snapshot.query} />}
    </GlassPanel>
  )
}
