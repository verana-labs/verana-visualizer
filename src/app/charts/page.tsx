'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'
import TokenSupplyChart from '@/components/charts/TokenSupplyChart'
import InflationChart from '@/components/charts/InflationChart'
import ValidatorDistributionChart from '@/components/charts/ValidatorDistributionChart'
import StakingDistributionChart from '@/components/charts/StakingDistributionChart'
import NetworkActivityChart from '@/components/charts/NetworkActivityChart'
import { 
  fetchHistoricalSupplyData,
  fetchHistoricalInflationData,
  fetchCurrentValidatorDistribution,
  fetchCurrentStakingDistribution,
  fetchHistoricalNetworkActivity
} from '@/lib/historicalDataFetcher'

export default function ChartsPage() {
  const [tokenSupplyData, setTokenSupplyData] = useState<any[]>([])
  const [inflationData, setInflationData] = useState<any[]>([])
  const [validatorData, setValidatorData] = useState<any[]>([])
  const [stakingData, setStakingData] = useState<any[]>([])
  const [networkActivityData, setNetworkActivityData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('Fetching historical data from Verana blockchain...')
        
        // Fetch data sequentially to show progress
        setLoadingMessage('Fetching token supply history...')
        setLoadingProgress(10)
        const supplyHistory = await fetchHistoricalSupplyData(30)
        setTokenSupplyData(supplyHistory)

        setLoadingMessage('Fetching inflation history...')
        setLoadingProgress(30)
        const inflationHistory = await fetchHistoricalInflationData(30)
        setInflationData(inflationHistory)

        setLoadingMessage('Fetching validator distribution...')
        setLoadingProgress(50)
        const validatorDist = await fetchCurrentValidatorDistribution()
        setValidatorData(validatorDist)

        setLoadingMessage('Fetching staking distribution...')
        setLoadingProgress(70)
        const stakingDist = await fetchCurrentStakingDistribution()
        setStakingData(stakingDist)

        setLoadingMessage('Fetching network activity...')
        setLoadingProgress(90)
        const networkActivity = await fetchHistoricalNetworkActivity(30)
        setNetworkActivityData(networkActivity)

        setLoadingProgress(100)
        setLoadingMessage('Complete!')

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart data')
        console.error('Error loading chart data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadChartData()
  }, [])

  return (
    <LayoutWrapper 
      title="Analytics Charts" 
      subtitle="Interactive Network Data Visualization"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Network Analytics
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Historical trends and distribution charts for Verana Network
          </p>
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium">Error loading data</p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          )}
          {isLoading && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p className="text-blue-700 dark:text-blue-300 font-medium">{loadingMessage}</p>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Fetching historical data from multiple block heights... This may take 10-30 seconds.
              </p>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* Token Supply Chart */}
          <div className="col-span-1">
            <TokenSupplyChart data={tokenSupplyData} isLoading={isLoading} />
          </div>

          {/* Inflation Chart */}
          <div className="col-span-1">
            <InflationChart data={inflationData} isLoading={isLoading} />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staking Distribution */}
            <div>
              <StakingDistributionChart data={stakingData} isLoading={isLoading} />
            </div>

            {/* Network Activity */}
            <div>
              <NetworkActivityChart data={networkActivityData} isLoading={isLoading} />
            </div>
          </div>

          {/* Validator Distribution */}
          <div className="col-span-1">
            <ValidatorDistributionChart data={validatorData} isLoading={isLoading} />
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              ✅ Real Blockchain Data
            </h3>
            <div className="px-2 py-1 rounded text-xs font-medium bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100">
              LIVE
            </div>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            These charts display <strong>real historical data</strong> from the Verana blockchain by querying 
            state at different block heights. Data is fetched directly from the network and represents actual 
            on-chain activity over the past 30 days. Hover over data points for detailed information, and interact 
            with the legends to show/hide specific data series.
          </p>
        </div>
      </div>
    </LayoutWrapper>
  )
}

