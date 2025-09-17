'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'
import EnhancedDashboardCards from '@/components/EnhancedDashboardCards'
import RefreshButton from '@/components/RefreshButton'
import BlockLoader from '@/components/BlockLoader'
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

  const loadNetworkData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const [apiResults] = await Promise.all([
        Promise.all([
          fetchSupply(),
          fetchInflation(),
          fetchMintParams(),
          fetchStakingPool(),
          fetchCommunityPool(),
          fetchValidators(),
          fetchProposals(),
          fetchHeader()
        ]),
        new Promise(resolve => setTimeout(resolve, isRefresh ? 2000 : 1000))
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

      setSupply(supplyData)
      setInflation(inflationData)
      setMintParams(mintParamsData)
      setStakingPool(stakingPoolData)
      setCommunityPool(communityPoolData)
      setValidators(validatorsData)
      setProposals(proposalsData)
      setHeader(headerData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load network data')
      console.error('Error loading network data:', err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadNetworkData(true)
  }

  useEffect(() => {
    loadNetworkData()
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
            <div>
              <RefreshButton 
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                autoRefreshInterval={30}
              />
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
            error={error}
          />
        </div>
      </LayoutWrapper>

      <BlockLoader 
        isLoading={isRefreshing} 
        message="Refreshing network data..."
      />
    </>
  )
}
