'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'
import DashboardCards from '@/components/DashboardCards'
import { fetchAbciInfo, fetchLatestBlock, fetchGenesis } from '@/lib/api'
import { AbciInfoResponse, BlockResponse, GenesisResponse } from '@/types'

export default function Dashboard() {
  const [abciInfo, setAbciInfo] = useState<AbciInfoResponse | null>(null)
  const [latestBlock, setLatestBlock] = useState<BlockResponse | null>(null)
  const [genesis, setGenesis] = useState<GenesisResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [abciInfoData, blockData, genesisData] = await Promise.all([
          fetchAbciInfo(),
          fetchLatestBlock(),
          fetchGenesis()
        ])

        setAbciInfo(abciInfoData)
        setLatestBlock(blockData)
        setGenesis(genesisData)
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
        <DashboardCards
          abciInfo={abciInfo}
          latestBlock={latestBlock}
          genesis={genesis}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </LayoutWrapper>
  )
}
