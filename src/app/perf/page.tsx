'use client'

import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'

const PerfHarness =
  process.env.NEXT_PUBLIC_PERF_HARNESS === '1'
    ? dynamic(() => import('../../../tests/perf/perf-harness').then((m) => m.PerfHarness), { ssr: false })
    : null

export default function PerfPage() {
  if (!PerfHarness) notFound()
  return <PerfHarness />
}
