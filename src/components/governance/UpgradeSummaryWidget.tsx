'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Proposal,
  UpgradeProposalData,
  UpgradeExecutionInfo,
  VotingSummary
} from '@/types'
import {
  buildUpgradeProposalData,
  formatProposalStatus,
  formatTimestamp,
  formatDate,
  formatNumber,
  formatVnaAmount,
  getExecutionStatusColor,
  extractBinaryVersion,
  parsePlanInfo
} from '@/lib/governanceUtils'
import { formatBlockHeight } from '@/lib/api'

interface UpgradeSummaryWidgetProps {
  proposal: Proposal
  className?: string
}

/**
 * Upgrade Summary Widget
 * 
 * Displays comprehensive information about software upgrade proposals including:
 * - Upgrade plan details
 * - Execution status with block time
 * - Voting summary with turnout percentage
 * - Timeline of proposal lifecycle
 */
export default function UpgradeSummaryWidget({
  proposal,
  className = ''
}: UpgradeSummaryWidgetProps) {
  const [upgradeData, setUpgradeData] = useState<UpgradeProposalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUpgradeData() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await buildUpgradeProposalData(proposal)
        setUpgradeData(data)
      } catch (err) {
        console.error('Error loading upgrade data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load upgrade data')
      } finally {
        setIsLoading(false)
      }
    }

    loadUpgradeData()
  }, [proposal])

  // Extract binary version from plan
  const binaryVersion = useMemo(() => {
    if (!upgradeData?.plan) return null
    return extractBinaryVersion(upgradeData.plan, proposal.title)
  }, [upgradeData?.plan, proposal.title])

  // Parse plan info for binaries table
  const parsedInfo = useMemo(() => {
    if (!upgradeData?.plan?.info) return null
    return parsePlanInfo(upgradeData.plan.info)
  }, [upgradeData?.plan?.info])

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-dark-surface rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!upgradeData?.isUpgradeProposal) {
    return null // Don't render for non-upgrade proposals
  }

  const { plan, execution, voting, authority, messageType } = upgradeData
  const statusColors = getExecutionStatusColor(execution.status)

  return (
    <div className={`bg-white dark:bg-dark-card rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-verana-accent to-purple-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Upgrade Summary</h3>
              <p className="text-white/80 text-sm">Software Upgrade Proposal</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors.bg} ${statusColors.text} ${statusColors.darkBg} ${statusColors.darkText}`}>
            {execution.status === 'executed' ? 'Executed' : 
             execution.status === 'pending' ? 'Pending' : 
             execution.status === 'not_executed' ? 'Not Executed' : 'Unknown'}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Message Type & Authority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard
            label="Message Type"
            value={messageType || 'N/A'}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            mono
          />
          <InfoCard
            label="Authority"
            value={authority || 'N/A'}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            mono
            truncate
          />
        </div>

        {/* Upgrade Plan Section */}
        {plan && (
          <Section title="Upgrade Plan" icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label="Plan Name" value={plan.name || 'N/A'} highlight />
              <InfoRow label="Plan Height" value={plan.height ? formatBlockHeight(plan.height) : 'N/A'} mono />
              {binaryVersion && (
                <InfoRow label="Binary Version" value={binaryVersion} mono highlight />
              )}
              <InfoRow 
                label="Scheduled Time" 
                value={plan.time && plan.time !== '0001-01-01T00:00:00Z' ? formatTimestamp(plan.time) : 'Height-based'} 
              />
            </div>

            {/* Execution Status */}
            <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-dark-surface">
              <ExecutionStatusDisplay execution={execution} />
            </div>

            {/* Plan Info (raw) */}
            {plan.info && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan Info</h5>
                <pre className="text-xs bg-gray-50 dark:bg-dark-surface p-3 rounded-lg overflow-x-auto font-mono text-gray-600 dark:text-gray-400">
                  {plan.info}
                </pre>
              </div>
            )}

            {/* Binaries Table */}
            {parsedInfo?.binaries && Object.keys(parsedInfo.binaries).length > 0 && (
              <BinariesTable binaries={parsedInfo.binaries} />
            )}
          </Section>
        )}

        {/* Timeline Section */}
        <Section title="Timeline" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="Submitted At" value={formatTimestamp(proposal.submit_time)} />
            <InfoRow label="Deposit End" value={formatTimestamp(proposal.deposit_end_time)} />
            <InfoRow label="Voting Start" value={formatTimestamp(proposal.voting_start_time)} />
            <InfoRow label="Voting End" value={formatTimestamp(proposal.voting_end_time)} />
          </div>
        </Section>

        {/* Voting Section */}
        <Section title="Voting Summary" icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }>
          <VotingSummaryDisplay voting={voting} />
        </Section>
      </div>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

function Section({ title, icon, children }: { 
  title: string
  icon: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <div>
      <div className="flex items-center space-x-2 mb-4">
        <span className="text-verana-accent dark:text-verana-accent/80">{icon}</span>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h4>
      </div>
      {children}
    </div>
  )
}

function InfoCard({ 
  label, 
  value, 
  icon, 
  mono = false,
  truncate = false 
}: { 
  label: string
  value: string
  icon: React.ReactNode
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg">
      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 mb-1">
        {icon}
        <span className="text-xs font-medium uppercase">{label}</span>
      </div>
      <p className={`text-sm text-gray-900 dark:text-white ${mono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}>
        {value}
      </p>
    </div>
  )
}

function InfoRow({ 
  label, 
  value, 
  mono = false,
  highlight = false 
}: { 
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}:</span>
      <span className={`text-sm ${highlight ? 'font-semibold' : ''} ${mono ? 'font-mono' : ''} text-gray-900 dark:text-white`}>
        {value}
      </span>
    </div>
  )
}

function ExecutionStatusDisplay({ execution }: { execution: UpgradeExecutionInfo }) {
  const statusColors = getExecutionStatusColor(execution.status)

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${
            execution.status === 'executed' ? 'bg-green-500' :
            execution.status === 'pending' ? 'bg-verana-accent animate-pulse' :
            execution.status === 'not_executed' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}></span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            Executed At
          </span>
        </div>
        <span className={`text-sm font-semibold ${
          execution.status === 'executed' ? 'text-green-600 dark:text-green-400' :
          execution.status === 'pending' ? 'text-verana-accent dark:text-verana-accent/80' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          {execution.status === 'executed' && execution.executedAt
            ? formatTimestamp(execution.executedAt)
            : execution.status === 'pending'
            ? 'Awaiting Execution'
            : 'Not Executed'}
        </span>
      </div>

      {/* Context Message */}
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        {execution.message}
      </p>

      {/* Current Height (if available) */}
      {execution.currentHeight && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Current Height:</span>
          <span className="font-mono text-gray-900 dark:text-white">
            {formatBlockHeight(execution.currentHeight)}
          </span>
        </div>
      )}
    </div>
  )
}

function VotingSummaryDisplay({ voting }: { voting: VotingSummary }) {
  const votes = [
    { label: 'Yes', value: voting.yesCount, color: 'bg-green-500' },
    { label: 'No', value: voting.noCount, color: 'bg-red-500' },
    { label: 'Abstain', value: voting.abstainCount, color: 'bg-gray-400' },
    { label: 'No With Veto', value: voting.noWithVetoCount, color: 'bg-orange-500' }
  ]

  // Calculate percentages for vote bar
  const totalVotes = BigInt(voting.totalVotingPower || '0')
  const getPercentage = (value: string) => {
    if (totalVotes === BigInt(0)) return 0
    return Number((BigInt(value) * BigInt(100)) / totalVotes)
  }

  return (
    <div className="space-y-4">
      {/* Vote Distribution Bar */}
      <div className="h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-dark-surface flex">
        {votes.map((vote) => {
          const pct = getPercentage(vote.value)
          if (pct === 0) return null
          return (
            <div
              key={vote.label}
              className={`${vote.color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${vote.label}: ${pct.toFixed(1)}%`}
            ></div>
          )
        })}
      </div>

      {/* Vote Counts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {votes.map((vote) => (
          <div key={vote.label} className="text-center">
            <div className={`w-3 h-3 rounded-full ${vote.color} mx-auto mb-1`}></div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{vote.label}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
              {formatVnaAmount(vote.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-dark-border">
        <div className="text-center md:text-left">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Voting Power</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
            {formatVnaAmount(voting.totalVotingPower)} VNA
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Bonded Tokens</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
            {formatVnaAmount(voting.bondedTokens)} VNA
          </p>
        </div>
        <div className="text-center md:text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Turnout</p>
          <p className="text-lg font-bold text-verana-accent dark:text-verana-accent/80">
            {voting.turnoutPercent === 'N/A' ? 'N/A' : `${voting.turnoutPercent}%`}
          </p>
        </div>
      </div>
    </div>
  )
}

function BinariesTable({ binaries }: { binaries: Record<string, string | undefined> }) {
  const entries = Object.entries(binaries).filter(([_, url]) => url)

  if (entries.length === 0) return null

  return (
    <div className="mt-4">
      <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Binaries</h5>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
              <th className="py-2 pr-4 w-1/4">Platform</th>
              <th className="py-2">Download URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
            {entries.map(([platform, url]) => (
              <tr key={platform}>
                <td className="py-2 pr-4 font-mono text-gray-900 dark:text-white align-top">{platform}</td>
                <td className="py-2 min-w-0">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-verana-accent dark:text-verana-accent/80 hover:underline break-all"
                  >
                    {url}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

