'use client'

import { useState, useEffect } from 'react'

interface RefreshButtonProps {
  onRefresh: () => void
  isRefreshing: boolean
  autoRefreshInterval?: number
}

export default function RefreshButton({ 
  onRefresh, 
  isRefreshing, 
  autoRefreshInterval = 30 
}: RefreshButtonProps) {
  const [countdown, setCountdown] = useState(autoRefreshInterval)
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true)

  useEffect(() => {
    if (!isAutoRefreshEnabled || isRefreshing) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onRefresh()
          return autoRefreshInterval
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isAutoRefreshEnabled, isRefreshing, onRefresh, autoRefreshInterval])

  const handleManualRefresh = () => {
    onRefresh()
    setCountdown(autoRefreshInterval)
  }

  const toggleAutoRefresh = () => {
    setIsAutoRefreshEnabled(!isAutoRefreshEnabled)
    if (!isAutoRefreshEnabled) {
      setCountdown(autoRefreshInterval)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={toggleAutoRefresh}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          isAutoRefreshEnabled
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-gray-100 text-gray-600 dark:bg-dark-surface dark:text-gray-400'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${
          isAutoRefreshEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`} />
        <span>Auto Refresh</span>
      </button>

      {isAutoRefreshEnabled && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Next refresh in <span className="font-mono font-semibold text-verana-accent">{countdown}s</span>
        </div>
      )}

      <button
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
          ${isRefreshing
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-dark-surface dark:text-gray-600'
            : 'bg-verana-accent text-white hover:bg-opacity-90 hover:shadow-lg transform hover:scale-105'
          }
        `}
      >
        <svg 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
          />
        </svg>
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh Now'}</span>
      </button>
    </div>
  )
}
