'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import LayoutWrapper from '@/components/LayoutWrapper'
import { UpgradeSummaryWidget } from '@/components/governance'
import { fetchProposal } from '@/lib/api'
import { Proposal } from '@/types'
import { isUpgradeProposal, formatProposalStatus } from '@/lib/governanceUtils'

export default function ProposalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const proposalId = params.id as string

  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProposal() {
      if (!proposalId) return

      try {
        setIsLoading(true)
        setError(null)
        const data = await fetchProposal(proposalId)
        setProposal(data.proposal)
      } catch (err) {
        console.error('Error loading proposal:', err)
        setError(err instanceof Error ? err.message : 'Failed to load proposal')
      } finally {
        setIsLoading(false)
      }
    }

    loadProposal()
  }, [proposalId])

  const isUpgrade = proposal ? isUpgradeProposal(proposal) : false

  return (
    <LayoutWrapper 
      title={`Proposal #${proposalId}`}
      subtitle="Governance Proposal Details"
    >
      <div className="p-6">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link 
                href="/governance" 
                className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Governance
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 dark:text-white font-medium">
              Proposal #{proposalId}
            </li>
          </ol>
        </nav>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onBack={() => router.push('/governance')} />
        ) : proposal ? (
          <div className="space-y-6">
            {/* Proposal Header */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gray-500 dark:text-gray-400 font-mono">#{proposal.id}</span>
                    <StatusBadge status={proposal.status} />
                    {isUpgrade && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Upgrade
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {proposal.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {proposal.summary}
                  </p>
                </div>
              </div>

              {/* Proposer Info */}
              <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Proposer: </span>
                    <span className="font-mono text-gray-900 dark:text-white">{proposal.proposer}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Submitted: </span>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(proposal.submit_time).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade Summary Widget - Only for upgrade proposals */}
            {isUpgrade && (
              <UpgradeSummaryWidget proposal={proposal} />
            )}

            {/* Standard Proposal Info (for non-upgrade or as fallback) */}
            {!isUpgrade && (
              <StandardProposalInfo proposal={proposal} />
            )}

            {/* Messages Section */}
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Proposal Messages
              </h3>
              <div className="space-y-4">
                {proposal.messages?.map((message, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Message {index + 1}
                      </span>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                        {message['@type']}
                      </span>
                    </div>
                    <pre className="text-xs bg-gray-100 dark:bg-dark-border p-3 rounded-lg overflow-x-auto font-mono text-gray-600 dark:text-gray-400">
                      {JSON.stringify(message, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Back Button */}
            <div className="flex justify-start">
              <Link
                href="/governance"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Proposals
              </Link>
            </div>
          </div>
        ) : (
          <NotFoundState proposalId={proposalId} />
        )}
      </div>
    </LayoutWrapper>
  )
}

// ============================================
// Sub-components
// ============================================

function StatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'PROPOSAL_STATUS_PASSED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'PROPOSAL_STATUS_REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'PROPOSAL_STATUS_VOTING_PERIOD':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'PROPOSAL_STATUS_DEPOSIT_PERIOD':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
      {formatProposalStatus(status)}
    </span>
  )
}

function StandardProposalInfo({ proposal }: { proposal: Proposal }) {
  const tally = proposal.final_tally_result

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Voting Summary
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <VoteBox label="Yes" value={tally.yes_count} color="green" />
        <VoteBox label="No" value={tally.no_count} color="red" />
        <VoteBox label="Abstain" value={tally.abstain_count} color="gray" />
        <VoteBox label="No With Veto" value={tally.no_with_veto_count} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-dark-border">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Voting Start</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(proposal.voting_start_time).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Voting End</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(proposal.voting_end_time).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Deposit End</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(proposal.deposit_end_time).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Deposit</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {proposal.total_deposit?.map(d => `${parseInt(d.amount) / 1000000} ${d.denom.replace('u', '').toUpperCase()}`).join(', ') || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  )
}

function VoteBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    gray: 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
  }

  const formatted = (parseInt(value || '0') / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">{formatted}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-dark-surface rounded w-1/4 mb-4"></div>
        <div className="h-8 bg-gray-200 dark:bg-dark-surface rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-full"></div>
      </div>
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-dark-surface rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-1/2"></div>
        </div>
      </div>
    </div>
  )
}

function ErrorState({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Error Loading Proposal
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Back to Proposals
        </button>
      </div>
    </div>
  )
}

function NotFoundState({ proposalId }: { proposalId: string }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
      <div className="text-center py-12">
        <svg 
          className="w-16 h-16 mx-auto text-gray-400 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Proposal Not Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Proposal #{proposalId} does not exist or has been removed.
        </p>
        <Link
          href="/governance"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          View All Proposals
        </Link>
      </div>
    </div>
  )
}

