'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutWrapper } from '@/components/layout'
import { ProposalList } from '@/components/governance'
import { fetchProposals, fetchCurrentHeight } from '@/lib/api'
import { ProposalsResponse } from '@/types'

export default function GovernancePage() {
  const [proposals, setProposals] = useState<ProposalsResponse | null>(null)
  const [currentHeight, setCurrentHeight] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)
        
        const [proposalsData, height] = await Promise.all([
          fetchProposals(),
          fetchCurrentHeight().catch(() => null)
        ])
        
        setProposals(proposalsData)
        setCurrentHeight(height)
      } catch (err) {
        console.error('Error loading governance data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load governance data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <LayoutWrapper 
      title="Governance" 
      subtitle="Proposals & Upgrades"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Governance Proposals
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              View and track on-chain governance proposals including software upgrades
            </p>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total Proposals"
              value={proposals?.proposals.length || 0}
              isLoading={isLoading}
            />
            <StatCard
              label="Upgrade Proposals"
              value={proposals?.proposals.filter(p => 
                p.messages?.some(m => m['@type']?.includes('MsgSoftwareUpgrade'))
              ).length || 0}
              isLoading={isLoading}
              highlight
            />
            {currentHeight && (
              <StatCard
                label="Current Height"
                value={parseInt(currentHeight).toLocaleString()}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={() => window.location.reload()} />
          ) : proposals?.proposals && proposals.proposals.length > 0 ? (
            <ProposalList 
              proposals={proposals.proposals}
              showFilter={true}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </LayoutWrapper>
  )
}

// ============================================
// Sub-components
// ============================================

function StatCard({ 
  label, 
  value, 
  isLoading, 
  highlight = false 
}: { 
  label: string
  value: number | string
  isLoading: boolean
  highlight?: boolean
}) {
  return (
    <div className={`px-4 py-3 rounded-lg min-w-0 ${
      highlight 
        ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800' 
        : 'bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border'
    }`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium truncate">{label}</p>
      {isLoading ? (
        <div className="h-6 w-16 bg-gray-200 dark:bg-dark-border rounded animate-pulse mt-1"></div>
      ) : (
        <p className={`text-lg sm:text-xl font-bold break-words ${
          highlight ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
        }`}>
          {value}
        </p>
      )}
    </div>
  )
}

function InfoCard({ 
  icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 border border-gray-200 dark:border-dark-border">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg animate-pulse">
          <div className="flex justify-between items-start mb-2">
            <div className="h-5 bg-gray-200 dark:bg-dark-border rounded w-3/4"></div>
            <div className="h-5 bg-gray-200 dark:bg-dark-border rounded w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-dark-border rounded w-full mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-dark-border rounded w-2/3"></div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Error Loading Proposals
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg 
        className="w-16 h-16 mx-auto text-gray-400 mb-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No Proposals Found
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        There are no governance proposals on the network yet.
      </p>
    </div>
  )
}

