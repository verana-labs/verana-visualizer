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
  const [chartsLoaded, setChartsLoaded] = useState(0)
  const totalCharts = 5

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setLoadingProgress(0)

        console.log('Fetching historical data from Verana blockchain...')
        setChartsLoaded(0)
        
        // Load charts progressively - show each as it loads
        // Group 1: Historical data (can be fetched in parallel)
        setLoadingMessage('Loading Token Supply & Inflation...')
        setLoadingProgress(10)
        
        await Promise.all([
          fetchHistoricalSupplyData(30).then(data => {
            setTokenSupplyData(data)
            setChartsLoaded(prev => prev + 1)
            setLoadingProgress(20)
            return data
          }),
          fetchHistoricalInflationData(30).then(data => {
            setInflationData(data)
            setChartsLoaded(prev => prev + 1)
            setLoadingProgress(30)
            return data
          })
        ])
        
        setLoadingProgress(40)

        // Group 2: Current distribution data (can be fetched in parallel)
        setLoadingMessage('Loading Staking & Validator data...')
        
        await Promise.all([
          fetchCurrentStakingDistribution().then(data => {
            setStakingData(data)
            setChartsLoaded(prev => prev + 1)
            setLoadingProgress(55)
            return data
          }),
          fetchCurrentValidatorDistribution().then(data => {
            setValidatorData(data)
            setChartsLoaded(prev => prev + 1)
            setLoadingProgress(70)
            return data
          })
        ])

        setLoadingProgress(80)

        // Group 3: Network activity
        setLoadingMessage('Loading Network Activity...')
        const networkActivity = await fetchHistoricalNetworkActivity(30)
        setNetworkActivityData(networkActivity)
        setChartsLoaded(5)

        setLoadingProgress(100)
        setLoadingMessage('All charts loaded!')

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
            <div className={`mt-4 rounded-lg transition-all duration-300 ${
              chartsLoaded > 0 
                ? 'p-3 bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50' 
                : 'p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className={`text-blue-700 dark:text-blue-300 ${
                    chartsLoaded > 0 ? 'text-sm' : 'font-medium'
                  }`}>
                    {loadingMessage}
                  </p>
                  {chartsLoaded === 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Fetching blockchain data in parallel batches...
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {chartsLoaded > 0 && (
                    <span className="text-xs text-blue-700 dark:text-blue-300 mr-2">
                      {chartsLoaded}/{totalCharts}
                    </span>
                  )}
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

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6">
          {/* Token Supply Chart */}
          <div className="col-span-1">
            <TokenSupplyChart data={tokenSupplyData} isLoading={tokenSupplyData.length === 0 && isLoading} />
          </div>

          {/* Inflation Chart */}
          <div className="col-span-1">
            <InflationChart data={inflationData} isLoading={inflationData.length === 0 && isLoading} />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staking Distribution */}
            <div>
              <StakingDistributionChart data={stakingData} isLoading={stakingData.length === 0 && isLoading} />
            </div>

            {/* Network Activity */}
            <div>
              <NetworkActivityChart data={networkActivityData} isLoading={networkActivityData.length === 0 && isLoading} />
            </div>
          </div>

          {/* Validator Distribution */}
          <div className="col-span-1">
            <ValidatorDistributionChart data={validatorData} isLoading={validatorData.length === 0 && isLoading} />
          </div>
        </div>

      </div>
    </LayoutWrapper>
  )
}

