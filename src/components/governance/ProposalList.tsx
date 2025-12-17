'use client'

import { useState, useMemo } from 'react'
import { Proposal } from '@/types'
import ProposalCard from './ProposalCard'
import { isUpgradeProposal } from '@/lib/governanceUtils'

interface ProposalListProps {
  proposals: Proposal[]
  showFilter?: boolean
  maxItems?: number
  className?: string
}

type FilterType = 'all' | 'upgrade' | 'passed' | 'voting' | 'rejected'

/**
 * Proposal List Component
 * 
 * Displays a filterable list of governance proposals with upgrade info.
 */
export default function ProposalList({
  proposals,
  showFilter = true,
  maxItems,
  className = ''
}: ProposalListProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProposals = useMemo(() => {
    let filtered = proposals

    // Apply filter
    switch (filter) {
      case 'upgrade':
        filtered = filtered.filter(p => isUpgradeProposal(p))
        break
      case 'passed':
        filtered = filtered.filter(p => p.status === 'PROPOSAL_STATUS_PASSED')
        break
      case 'voting':
        filtered = filtered.filter(p => p.status === 'PROPOSAL_STATUS_VOTING_PERIOD')
        break
      case 'rejected':
        filtered = filtered.filter(p => p.status === 'PROPOSAL_STATUS_REJECTED')
        break
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.summary.toLowerCase().includes(query) ||
        p.id.includes(query)
      )
    }

    // Apply max items limit
    if (maxItems && maxItems > 0) {
      filtered = filtered.slice(0, maxItems)
    }

    return filtered
  }, [proposals, filter, searchQuery, maxItems])

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'upgrade', label: 'Upgrades' },
    { key: 'voting', label: 'Voting' },
    { key: 'passed', label: 'Passed' },
    { key: 'rejected', label: 'Rejected' }
  ]

  return (
    <div className={className}>
      {/* Filter & Search Bar */}
      {showFilter && (
        <div className="mb-6 space-y-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === key
                    ? 'bg-verana-accent text-white'
                    : 'bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border'
                }`}
              >
                {label}
                {key === 'upgrade' && (
                  <span className="ml-1.5 text-xs opacity-75">
                    ({proposals.filter(p => isUpgradeProposal(p)).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search proposals by title, summary, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-verana-accent focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>
      )}

      {/* Proposals List */}
      {filteredProposals.length > 0 ? (
        <div className="space-y-4">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              showUpgradeInfo={true}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg 
            className="w-12 h-12 mx-auto text-gray-400 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? 'No proposals match your search criteria'
              : filter === 'all' 
                ? 'No proposals found' 
                : `No ${filter} proposals found`
            }
          </p>
        </div>
      )}
    </div>
  )
}

