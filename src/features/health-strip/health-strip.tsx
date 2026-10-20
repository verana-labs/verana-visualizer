'use client'

import { useEffect, useState } from 'react'
import type { NetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { checkHealth, type HealthReport, lagTone, MAX_GREEN_LAG } from './check-health'

export const REFRESH_MS = 30_000

const TONES = { green: '#22c55e', amber: '#f59e0b' } as const
const DOWN = '#ff6b8b'

const clock = (date: Date) => `${date.toISOString().slice(11, 19)} UTC`

function lagText(lag: number) {
  return `lag ${lag.toLocaleString('en-US')} block${Math.abs(lag) === 1 ? '' : 's'}`
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-[7px] rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  )
}

export function HealthStrip({ cfg }: { cfg: NetworkConfig }) {
  const [report, setReport] = useState<HealthReport | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    let issued = 0
    let applied = 0
    const run = () => {
      const id = ++issued
      checkHealth(cfg).then(
        (next) => {
          if (cancelled || id < applied) return
          applied = id
          setReport(next)
        },
        (error: unknown) => logger.error('The health check could not run', error)
      )
    }
    run()
    const timer = setInterval(run, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [cfg])

  return (
    <div data-testid="health-strip" className="border-t border-scene-line pt-2 text-[10.5px] text-scene-mut">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Service health"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 text-left hover:text-white"
      >
        {report === null ? (
          <span>checking services…</span>
        ) : (
          <>
            {report.services.map((service) => (
              <span
                key={service.id}
                data-testid={`health-${service.id}`}
                data-up={String(service.up)}
                className="flex items-center gap-1"
              >
                <Dot color={service.up ? TONES.green : DOWN} />
                {service.id}
              </span>
            ))}
            <span
              data-testid="health-lag"
              data-tone={report.lag === null ? 'unknown' : lagTone(report.lag)}
              style={{ color: report.lag === null ? undefined : TONES[lagTone(report.lag)] }}
            >
              {report.lag === null ? 'lag unknown' : lagText(report.lag)}
            </span>
          </>
        )}
        <span className="ml-auto">{open ? '▴' : '▾'}</span>
      </button>
      {open && report && (
        <div data-testid="health-detail" className="mt-1.5 space-y-1">
          {report.services.map((service) => (
            <div key={service.id}>
              <span className="text-scene-txt">{service.id}</span>
              <span style={{ color: service.up ? TONES.green : DOWN }}>{service.up ? ' up' : ' down'}</span>
              <div className="break-words">{service.detail}</div>
            </div>
          ))}
          <div>{`Indexer lag: blocks the indexer is behind the chain head (green up to ${MAX_GREEN_LAG}).`}</div>
        </div>
      )}
      {report && (
        <div className="mt-1">
          checked <span data-testid="health-checked">{clock(report.checkedAt)}</span>
          {` · every ${REFRESH_MS / 1000} s`}
        </div>
      )}
    </div>
  )
}
