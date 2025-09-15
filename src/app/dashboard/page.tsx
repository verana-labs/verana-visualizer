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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [
          supplyData,
          inflationData,
          mintParamsData,
          stakingPoolData,
          communityPoolData,
          validatorsData,
          proposalsData,
          headerData
        ] = await Promise.all([
          fetchSupply(),
          fetchInflation(),
          fetchMintParams(),
          fetchStakingPool(),
          fetchCommunityPool(),
          fetchValidators(),
          fetchProposals(),
          fetchHeader()
        ])

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
      }
    }

    loadNetworkData()

    // Refresh data every 30 seconds
    const interval = setInterval(loadNetworkData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <LayoutWrapper 
      title="Dashboard" 
      subtitle="Verana Network Overview"
    >
      <div className="p-6">
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
  )
}
