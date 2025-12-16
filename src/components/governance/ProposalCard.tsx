'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Proposal, UpgradeExecutionInfo } from '@/types'
import {
  isUpgradeProposal,
  extractUpgradePlan,
  determineUpgradeExecutionStatus,
  formatProposalStatus,
  formatDate,
  getExecutionStatusColor,
  extractBinaryVersion
} from '@/lib/governanceUtils'
import { formatBlockHeight } from '@/lib/api'

interface ProposalCardProps {
  proposal: Proposal
  showUpgradeInfo?: boolean
  compact?: boolean
  className?: string
}

/**
 * Proposal Card Component
 * 
 * Displays a governance proposal with optional upgrade information.
 * Used in the dashboard's Recent Proposals section and proposal list.
 */
export default function ProposalCard({
  proposal,
  showUpgradeInfo = true,
  compact = false,
  className = ''
}: ProposalCardProps) {
  const [execution, setExecution] = useState<UpgradeExecutionInfo | null>(null)
  const [isLoadingExecution, setIsLoadingExecution] = useState(false)

  const isUpgrade = useMemo(() => isUpgradeProposal(proposal), [proposal])
  const plan = useMemo(() => isUpgrade ? extractUpgradePlan(proposal) : null, [proposal, isUpgrade])
  const binaryVersion = useMemo(() => {
    if (!plan) return null
    return extractBinaryVersion(plan, proposal.title)
  }, [plan, proposal.title])

  // Load execution status for upgrade proposals
  useEffect(() => {
    async function loadExecutionStatus() {
      if (!isUpgrade || !plan?.height || !showUpgradeInfo) return

      try {
        setIsLoadingExecution(true)
        const executionInfo = await determineUpgradeExecutionStatus(proposal, plan.height)
        setExecution(executionInfo)
      } catch (error) {
        console.error('Error loading execution status:', error)
      } finally {
        setIsLoadingExecution(false)
      }
    }

    loadExecutionStatus()
  }, [proposal, isUpgrade, plan?.height, showUpgradeInfo])

  const statusColor = getProposalStatusColor(proposal.status)

  return (
    <div className={`p-4 bg-gray-50 dark:bg-dark-surface rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <Link 
          href={`/governance/${proposal.id}`}
          className="font-semibold text-gray-900 dark:text-white hover:text-verana-accent dark:hover:text-verana-accent/80 transition-colors flex-1 min-w-0"
        >
          <span className="text-gray-500 dark:text-gray-400">#{proposal.id}</span>
          {' - '}
          <span className="break-words">{proposal.title}</span>
        </Link>
        <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusColor.bg} ${statusColor.text} ${statusColor.darkBg} ${statusColor.darkText}`}>
          {formatProposalStatus(proposal.status)}
        </span>
      </div>

      {/* Summary */}
      {!compact && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {proposal.summary}
        </p>
      )}

      {/* Upgrade Info Badge */}
      {isUpgrade && showUpgradeInfo && plan && (
        <UpgradeInfoBadge
          plan={plan}
          execution={execution}
          binaryVersion={binaryVersion}
          isLoading={isLoadingExecution}
        />
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400 gap-1 mt-3">
        <span className="truncate">
          Proposer: {proposal.proposer.substring(0, 20)}...
        </span>
        <span>
          {formatDate(proposal.submit_time)}
        </span>
      </div>
    </div>
  )
}

/**
 * Upgrade Info Badge
 * Shows lightweight upgrade execution info for dashboard cards
 */
function UpgradeInfoBadge({
  plan,
  execution,
  binaryVersion,
  isLoading
}: {
  plan: { height: string; name: string }
  execution: UpgradeExecutionInfo | null
  binaryVersion: string | null
  isLoading: boolean
}) {
  const statusColors = execution ? getExecutionStatusColor(execution.status) : null

  return (
    <div className="mb-3 p-3 bg-verana-accent/10 dark:bg-verana-accent/20 rounded-lg border border-verana-accent/30 dark:border-verana-accent/40">
      <div className="flex items-center space-x-2 mb-2">
        <svg className="w-4 h-4 text-verana-accent dark:text-verana-accent/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs font-semibold text-verana-accent dark:text-verana-accent/80">
          Software Upgrade
        </span>
      </div>
      
      <div className="space-y-1 text-xs">
        {/* Upgrade Height */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Upgrade Height:</span>
          <span className="font-mono font-semibold text-gray-900 dark:text-white">
            {formatBlockHeight(plan.height)}
          </span>
        </div>

        {/* Binary Version */}
        {binaryVersion && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Version:</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">
              {binaryVersion}
            </span>
          </div>
        )}

        {/* Execution Status */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          {isLoading ? (
            <span className="text-gray-400 dark:text-gray-500 animate-pulse">Loading...</span>
          ) : execution ? (
            <span className={`font-semibold px-1.5 py-0.5 rounded ${statusColors?.bg} ${statusColors?.text} ${statusColors?.darkBg} ${statusColors?.darkText}`}>
              {execution.status === 'executed' ? 'executed' : 'not executed'}
            </span>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Get color classes for proposal status
 */
function getProposalStatusColor(status: string): {
  bg: string
  text: string
  darkBg: string
  darkText: string
} {
  switch (status) {
    case 'PROPOSAL_STATUS_PASSED':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        darkBg: 'dark:bg-green-900',
        darkText: 'dark:text-green-200'
      }
    case 'PROPOSAL_STATUS_REJECTED':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        darkBg: 'dark:bg-red-900',
        darkText: 'dark:text-red-200'
      }
    case 'PROPOSAL_STATUS_VOTING_PERIOD':
      return {
        bg: 'bg-verana-accent/15',
        text: 'text-verana-accent',
        darkBg: 'dark:bg-verana-accent/30',
        darkText: 'dark:text-verana-accent/80'
      }
    case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        darkBg: 'dark:bg-yellow-900',
        darkText: 'dark:text-yellow-200'
      }
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        darkBg: 'dark:bg-gray-700',
        darkText: 'dark:text-gray-200'
      }
  }
}

