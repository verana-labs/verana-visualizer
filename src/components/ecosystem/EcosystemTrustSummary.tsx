'use client'

import { EcosystemMetrics } from '@/types'

interface EcosystemTrustSummaryProps {
  metrics: EcosystemMetrics | null
  isLoading: boolean
}

function formatWeight(weight: number): string {
  if (weight >= 1_000_000) return `${(weight / 1_000_000).toFixed(1)}M`
  if (weight >= 1_000) return `${(weight / 1_000).toFixed(1)}K`
  return weight.toString()
}

export default function EcosystemTrustSummary({ metrics, isLoading }: EcosystemTrustSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton, fixed length, never reordered
            key={i}
            className="bg-white dark:bg-dark-card rounded-lg p-5 animate-pulse border border-gray-200 dark:border-dark-border"
          >
            <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-2/3 mb-3"></div>
            <div className="h-6 bg-gray-200 dark:bg-dark-surface rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!metrics) return null

  const totalSlashEvents = metrics.ecosystem_slash_events + metrics.network_slash_events
  const totalSlashed = metrics.ecosystem_slashed_amount + metrics.network_slashed_amount
  const totalRepaid = metrics.ecosystem_slashed_amount_repaid + metrics.network_slashed_amount_repaid

  const items = [
    {
      label: 'Total Trust Weight',
      value: formatWeight(metrics.weight),
      detail: `${metrics.weight.toLocaleString()} raw`,
      color: '#3b82f6',
    },
    {
      label: 'Slash Events',
      value: totalSlashEvents.toString(),
      detail:
        totalSlashEvents > 0
          ? `${formatWeight(totalSlashed)} slashed / ${formatWeight(totalRepaid)} repaid`
          : 'No slashing activity',
      color: totalSlashEvents > 0 ? '#ef4444' : '#10b981',
    },
    {
      label: 'Schema Health',
      value: `${metrics.active_schemas} active`,
      detail: `${metrics.archived_schemas} archived`,
      color: '#10b981',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white dark:bg-dark-card rounded-lg p-5 border border-gray-200 dark:border-dark-border"
        >
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
          <div className="text-2xl font-bold mt-1" style={{ color: item.color }}>
            {item.value}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{item.detail}</span>
        </div>
      ))}
    </div>
  )
}
