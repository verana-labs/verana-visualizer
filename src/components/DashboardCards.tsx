'use client'

import { AbciInfoResponse, BlockResponse, GenesisResponse } from '@/types'
import { formatBlockHeight, formatInflationRate, formatTotalSupply } from '@/lib/api'

interface DashboardCardsProps {
  abciInfo: AbciInfoResponse | null
  latestBlock: BlockResponse | null
  genesis: GenesisResponse | null
  isLoading: boolean
  error: string | null
}

export default function DashboardCards({ abciInfo, latestBlock, genesis, isLoading, error }: DashboardCardsProps) {
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getConnectionStatus = () => {
    if (isLoading) return { status: 'loading', text: 'Connecting...', color: 'text-yellow-500' }
    if (error) return { status: 'error', text: 'Disconnected', color: 'text-red-500' }
    return { status: 'connected', text: 'Connected', color: 'text-green-500' }
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.status === 'connected' ? 'bg-green-500' : connectionStatus.status === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network Status</h3>
          </div>
          <span className={`text-sm font-medium ${connectionStatus.color}`}>
            {connectionStatus.text}
          </span>
        </div>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Version Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Version</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : abciInfo?.result.response.version || 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2h-1v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6H4a1 1 0 110-2h3zM9 6v10h6V6H9z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Block Height Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Block Height</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : latestBlock ? formatBlockHeight(latestBlock.result.block.header.height) : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Supply Card */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Supply</p>
              <p className="text-lg font-bold mt-1">
                {isLoading ? '...' : genesis ? formatTotalSupply(genesis.result.genesis.app_state.bank.supply[0]?.amount || '0') : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Inflation Rate Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Inflation Rate</p>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? '...' : genesis ? formatInflationRate(genesis.result.genesis.app_state.mint.minter.inflation) : 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Block Info */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Block</h3>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded animate-pulse w-1/2" />
            </div>
          ) : latestBlock ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Height</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatBlockHeight(latestBlock.result.block.header.height)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Time</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatTime(latestBlock.result.block.header.time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Hash</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white truncate ml-2">
                  {latestBlock.result.block_id.hash.substring(0, 16)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Transactions</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {latestBlock.result.block.data.txs.length}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No block data available</p>
          )}
        </div>

        {/* Network Info */}
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network Info</h3>
          </div>
          
          {isLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded animate-pulse" />
              <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded animate-pulse w-1/2" />
            </div>
          ) : abciInfo ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Chain ID</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {latestBlock?.result.block.header.chain_id || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">App Hash</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white truncate ml-2">
                  {abciInfo.result.response.last_block_app_hash.substring(0, 16)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Data</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {abciInfo.result.response.data}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No network data available</p>
          )}
        </div>
      </div>
    </div>
  )
}
