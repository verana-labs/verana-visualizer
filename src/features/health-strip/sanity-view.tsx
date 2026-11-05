'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type NetworkConfig, useNetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'
import { type Outcome, runSanityChecks, type SanityReport } from './sanity-checks'

type SanityFormat = 'html' | 'json'

type RunState = { status: 'running' } | { status: 'done'; report: SanityReport } | { status: 'error'; message: string }

const OUTCOME_COLORS: Record<Outcome, string> = { pass: '#22c55e', fail: '#ff6b8b', skip: '#94a3b8' }

function summary(report: SanityReport): string {
  const failing = report.results.filter((r) => r.outcome === 'fail').length
  const skipped = report.results.filter((r) => r.outcome === 'skip').length
  const passing = report.results.length - failing - skipped
  const skipNote = skipped > 0 ? ` · ${skipped} skipped` : ''
  return failing === 0 ? `all ${passing} passing${skipNote}` : `${failing} failing · ${passing} passing${skipNote}`
}

function useSanityRun(cfg: NetworkConfig) {
  const [state, setState] = useState<RunState>({ status: 'running' })
  const latest = useRef(0)

  const run = useCallback(() => {
    const id = ++latest.current
    setState({ status: 'running' })
    runSanityChecks(cfg).then(
      (report) => {
        if (latest.current === id) setState({ status: 'done', report })
      },
      (error: unknown) => {
        logger.error('The sanity checks could not run', error)
        if (latest.current === id)
          setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    )
  }, [cfg])

  useEffect(() => {
    run()
    return () => {
      latest.current++
    }
  }, [run])

  return { state, rerun: run }
}

function ConfigList({ cfg }: { cfg: NetworkConfig }) {
  return (
    <section aria-label="Network config" className="mt-4">
      <h2 className="text-[10px] uppercase tracking-[.09em] text-scene-mut">resolved network config</h2>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 font-mono text-[11.5px]">
        {Object.entries(cfg).map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-scene-mut">{key}</dt>
            <dd className="break-all">{value === null ? '—' : String(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function ResultsTable({ report }: { report: SanityReport }) {
  return (
    <table aria-label="Checks" className="mt-3 w-full border-collapse text-left text-[12px]">
      <thead className="text-[10px] uppercase tracking-[.09em] text-scene-mut">
        <tr>
          <th className="py-1 pr-3 font-normal">method</th>
          <th className="py-1 pr-3 font-normal">result</th>
          <th className="py-1 pr-3 font-normal">HTTP</th>
          <th className="py-1 pr-3 font-normal">latency</th>
          <th className="py-1 font-normal">request · note</th>
        </tr>
      </thead>
      <tbody>
        {report.results.map((r) => (
          <tr key={r.method} className="border-t border-scene-line align-top">
            <td className="py-1 pr-3 font-mono">{r.method}</td>
            <td className="py-1 pr-3 font-semibold" style={{ color: OUTCOME_COLORS[r.outcome] }}>
              {r.outcome}
            </td>
            <td className="py-1 pr-3 tabular-nums">{r.status ?? '—'}</td>
            <td className="py-1 pr-3 tabular-nums">{r.latencyMs === null ? '—' : `${r.latencyMs} ms`}</td>
            <td className="break-all py-1 font-mono text-[11px] text-scene-mut">
              {r.url}
              {r.note && <div className="text-scene-txt">{r.note}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function SanityView({ cfg, format }: { cfg: NetworkConfig; format: SanityFormat }) {
  const { state, rerun } = useSanityRun(cfg)

  if (format === 'json') {
    const body =
      state.status === 'done'
        ? state.report
        : state.status === 'error'
          ? { ok: false, error: state.message, network: cfg }
          : { status: 'running', network: cfg }
    return (
      <pre
        data-testid="health-json"
        data-state={state.status}
        className="whitespace-pre-wrap p-4 font-mono text-[12px]"
      >
        {JSON.stringify(body, null, 2)}
      </pre>
    )
  }

  return (
    <main className="min-h-screen bg-scene-bg p-4 text-scene-txt sm:p-8">
      <GlassPanel className="mx-auto max-w-5xl p-5">
        <div className="text-[10px] uppercase tracking-[.09em] text-scene-mut">post-deploy sanity · internal</div>
        <h1 className="mt-1 text-lg font-semibold">{`Data sources for ${cfg.chainId}`}</h1>
        <p className="mt-1 text-[12px] text-scene-mut">
          Every client method the visualizer uses, called from this browser against the configured network, so CORS is
          tested too. Add <code>?format=json</code> for the machine-readable report.
        </p>
        <div className="mt-3 flex items-center gap-3 text-[13px]">
          <Button onClick={rerun} disabled={state.status === 'running'}>
            Run again
          </Button>
          {state.status === 'running' && <span className="text-scene-mut">Running every check…</span>}
          {state.status === 'error' && (
            <span role="alert" className="text-[#ff8a8a]">
              {state.message}
            </span>
          )}
          {state.status === 'done' && (
            <span
              data-testid="health-summary"
              style={{ color: state.report.ok ? OUTCOME_COLORS.pass : OUTCOME_COLORS.fail }}
            >
              {`${summary(state.report)} · finished ${state.report.finishedAt}`}
            </span>
          )}
        </div>
        {state.status === 'done' && <ResultsTable report={state.report} />}
        <ConfigList cfg={cfg} />
      </GlassPanel>
    </main>
  )
}

export function HealthRoute() {
  const cfg = useNetworkConfig()
  const format: SanityFormat = useSearchParams().get('format') === 'json' ? 'json' : 'html'
  return <SanityView cfg={cfg} format={format} />
}
