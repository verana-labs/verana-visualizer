'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'
import EnhancedDashboardCards from '@/components/EnhancedDashboardCards'
import { 
  fetchSupply, 
  fetchInflation, 
  fetchMintParams, 
  fetchStakingPool, 
  fetchCommunityPool, 
  fetchValidators, 
  fetchProposals,
  fetchHeader
} from '@/lib/api'
import { 
  SupplyResponse, 
  InflationResponse, 
  MintParamsResponse, 
  StakingPoolResponse, 
  CommunityPoolResponse, 
  ValidatorsResponse, 
  ProposalsResponse,
  HeaderResponse
} from '@/types'

export default function Dashboard() {
  const [supply, setSupply] = useState<SupplyResponse | null>(null)
  const [inflation, setInflation] = useState<InflationResponse | null>(null)
  const [mintParams, setMintParams] = useState<MintParamsResponse | null>(null)
  const [stakingPool, setStakingPool] = useState<StakingPoolResponse | null>(null)
  const [communityPool, setCommunityPool] = useState<CommunityPoolResponse | null>(null)
  const [validators, setValidators] = useState<ValidatorsResponse | null>(null)
  const [proposals, setProposals] = useState<ProposalsResponse | null>(null)
  const [header, setHeader] = useState<HeaderResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(true)

  const loadNetworkData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      // Fetch new data in the background
      const apiResults = await Promise.all([
        fetchSupply(),
        fetchInflation(),
        fetchMintParams(),
        fetchStakingPool(),
        fetchCommunityPool(),
        fetchValidators(),
        fetchProposals(),
        fetchHeader()
      ])

      const [
        supplyData,
        inflationData,
        mintParamsData,
        stakingPoolData,
        communityPoolData,
        validatorsData,
        proposalsData,
        headerData
      ] = apiResults

      // Atomically update all state at once to prevent flickering
      // This preserves existing data during refresh until new data is ready
      setSupply(supplyData)
      setInflation(inflationData)
      setMintParams(mintParamsData)
      setStakingPool(stakingPoolData)
      setCommunityPool(communityPoolData)
      setValidators(validatorsData)
      setProposals(proposalsData)
      setHeader(headerData)
      
      // Mark as connected when data loads successfully
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network data')
      console.error('Error loading network data:', err)
      
      // Mark as disconnected on error
      setIsConnected(false)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadNetworkData(true)
  }

  // Initial data load
  useEffect(() => {
    loadNetworkData()
  }, [])
  
  // Handle auto refresh every 30 seconds
  useEffect(() => {
    // Initial connection status
    setIsConnected(true)
    
    // Create interval for background refresh every 30 seconds
    // Using isRefresh=true to show refresh indicator
    const refreshTimer = setInterval(() => {
      loadNetworkData(true).catch(err => {
        console.error('Auto-refresh failed:', err)
        setIsConnected(false)
      })
    }, 30000)
    
    return () => clearInterval(refreshTimer)
  }, [])

  return (
    <>
      <LayoutWrapper 
        title="Dashboard" 
        subtitle="Verana Network Overview"
      >
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Network Overview
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Real-time data from the Verana network
              </p>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-blue-500' : 'bg-red-500'}`}></div>
              <span className={`text-sm font-medium ${isConnected ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <EnhancedDashboardCards
            supply={supply}
            inflation={inflation}
            mintParams={mintParams}
            stakingPool={stakingPool}
            communityPool={communityPool}
            validators={validators}
            proposals={proposals}
            header={header}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            error={error}
          />
        </div>
      </LayoutWrapper>

    </>
  )
}
