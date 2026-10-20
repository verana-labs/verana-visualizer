import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HealthRoute } from '@/features/health-strip/sanity-view'

export const metadata: Metadata = { title: 'Health · Verana Visualizer', robots: { index: false, follow: false } }

export default function HealthPage() {
  return (
    <Suspense>
      <HealthRoute />
    </Suspense>
  )
}
