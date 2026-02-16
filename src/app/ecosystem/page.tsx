'use client'

import { useState, useEffect } from 'react'
import { LayoutWrapper } from '@/components/layout'
import { EcosystemMetrics, EcosystemMetricsDataPoint } from '@/types'
import { fetchEcosystemMetrics } from '@/lib/api'
import { fetchHistoricalEcosystemData } from '@/lib/ecosystemDataFetcher'
import EcosystemHeroCards from '@/components/ecosystem/EcosystemHeroCards'
import EcosystemGrowthChart from '@/components/ecosystem/EcosystemGrowthChart'
import EcosystemCredentialChart from '@/components/ecosystem/EcosystemCredentialChart'
import EcosystemTrustSummary from '@/components/ecosystem/EcosystemTrustSummary'

export default function EcosystemPage() {
  const [metrics, setMetrics] = useState<EcosystemMetrics | null>(null)
  const [historicalData, setHistoricalData] = useState<EcosystemMetricsDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCharts, setIsLoadingCharts] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Step 1: Fetch current metrics (fast)
        setLoadingMessage('Loading current metrics...')
        setLoadingProgress(10)
        const currentMetrics = await fetchEcosystemMetrics()
        setMetrics(currentMetrics)
        setIsLoading(false)
        setLoadingProgress(30)

        // Step 2: Fetch historical data (slow, progressive)
        setLoadingMessage('Loading historical trends...')
        setIsLoadingCharts(true)
        const historical = await fetchHistoricalEcosystemData(30)
        setHistoricalData(historical)
        setLoadingProgress(100)
        setLoadingMessage('All data loaded!')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ecosystem data')
        console.error('Error loading ecosystem data:', err)
      } finally {
        setIsLoading(false)
        setIsLoadingCharts(false)
      }
    }

    loadData()
  }, [])

  return (
    <LayoutWrapper
      title="Ecosystem Health"
      subtitle="SSI Growth & Trust Metrics"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Ecosystem Health
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Track the growth of Verana&apos;s decentralized identity layer
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium">Error loading data</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-verana-accent text-white rounded-lg hover:bg-opacity-90 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}
          {isLoadingCharts && !error && (
            <div className="mt-4 p-3 bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-700 dark:text-blue-300">{loadingMessage}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-32 bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 tabular-nums">
                    {Math.round(loadingProgress)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Section 1: Hero Metrics */}
          <EcosystemHeroCards metrics={metrics} isLoading={isLoading} />

          {/* Section 2: Growth Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EcosystemGrowthChart
              data={historicalData}
              isLoading={historicalData.length === 0 && isLoadingCharts}
            />
            <EcosystemCredentialChart
              data={historicalData}
              isLoading={historicalData.length === 0 && isLoadingCharts}
            />
          </div>

          {/* Section 3: Trust Summary */}
          <EcosystemTrustSummary metrics={metrics} isLoading={isLoading} />
        </div>
      </div>
    </LayoutWrapper>
  )
}
