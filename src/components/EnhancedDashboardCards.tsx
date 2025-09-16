'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { convertUvnaToVna, formatInflationRate, formatBlockHeight } from '@/lib/api'

interface EnhancedDashboardCardsProps {
  supply: SupplyResponse | null
  inflation: InflationResponse | null
  mintParams: MintParamsResponse | null
  stakingPool: StakingPoolResponse | null
  communityPool: CommunityPoolResponse | null
  validators: ValidatorsResponse | null
  proposals: ProposalsResponse | null
  header: HeaderResponse | null
  isLoading: boolean
  error: string | null
}

export default function EnhancedDashboardCards({
  supply,
  inflation,
  mintParams,
  stakingPool,
  communityPool,
  validators,
  proposals,
  header,
  isLoading,
  error
}: EnhancedDashboardCardsProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)

  const handleCardClick = (cardId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedCard(prevSelected => {
      if (prevSelected === cardId) {
        return null
      } else {
        return cardId
      }
    })
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 dark:bg-dark-surface rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-dark-surface rounded w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-verana-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const totalSupply = supply?.supply[0] ? convertUvnaToVna(supply.supply[0].amount) : '0'
  const inflationRate = inflation ? formatInflationRate(inflation.inflation) : '0%'
  const bondedTokens = stakingPool ? convertUvnaToVna(stakingPool.pool.bonded_tokens) : '0'
  const notBondedTokens = stakingPool ? convertUvnaToVna(stakingPool.pool.not_bonded_tokens) : '0'
  const communityPoolAmount = communityPool?.pool[0] ? convertUvnaToVna(communityPool.pool[0].amount) : '0'
  const blockHeight = header ? formatBlockHeight(header.result.header.height) : '0'
  const activeValidators = validators?.validators.filter(v => v.status === 'BOND_STATUS_BONDED').length || 0
  const totalValidators = validators?.validators.length || 0
  const activeProposals = proposals?.proposals.filter(p => p.status === 'PROPOSAL_STATUS_VOTING_PERIOD').length || 0
  const totalProposals = proposals?.proposals.length || 0

  const cards = [
    {
      id: 'supply',
      title: 'Total Supply',
      value: `${parseFloat(totalSupply).toLocaleString()} VNA`,
      subtitle: 'Circulating Supply',
      icon: (
        <svg className="w-8 h-8 text-verana-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      details: {
        'Denomination': 'uvna',
        'Raw Amount': supply?.supply[0]?.amount || '0',
        'Formatted': `${parseFloat(totalSupply).toLocaleString()} VNA`
      }
    },
    {
      id: 'inflation',
      title: 'Inflation Rate',
      value: inflationRate,
      subtitle: 'Annual Inflation',
      icon: (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      details: {
        'Current Rate': inflationRate,
        'Min Rate': mintParams ? formatInflationRate(mintParams.params.inflation_min) : '0%',
        'Max Rate': mintParams ? formatInflationRate(mintParams.params.inflation_max) : '0%',
        'Rate Change': mintParams ? formatInflationRate(mintParams.params.inflation_rate_change) : '0%'
      }
    },
    {
      id: 'staking',
      title: 'Staking Pool',
      value: `${parseFloat(bondedTokens).toLocaleString()} VNA`,
      subtitle: `${activeValidators}/${totalValidators} Validators`,
      icon: (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      details: {
        'Bonded Tokens': `${parseFloat(bondedTokens).toLocaleString()} VNA`,
        'Not Bonded': `${parseFloat(notBondedTokens).toLocaleString()} VNA`,
        'Active Validators': activeValidators.toString(),
        'Total Validators': totalValidators.toString()
      }
    },
    {
      id: 'community',
      title: 'Community Pool',
      value: `${parseFloat(communityPoolAmount).toLocaleString()} VNA`,
      subtitle: 'Available for Governance',
      icon: (
        <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      details: {
        'Pool Amount': `${parseFloat(communityPoolAmount).toLocaleString()} VNA`,
        'Denomination': 'uvna',
        'Raw Amount': communityPool?.pool[0]?.amount || '0'
      }
    },
    {
      id: 'governance',
      title: 'Governance',
      value: `${activeProposals}/${totalProposals}`,
      subtitle: 'Active Proposals',
      icon: (
        <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      details: {
        'Active Proposals': activeProposals.toString(),
        'Total Proposals': totalProposals.toString(),
        'Passed Proposals': proposals?.proposals.filter(p => p.status === 'PROPOSAL_STATUS_PASSED').length.toString() || '0',
        'Rejected Proposals': proposals?.proposals.filter(p => p.status === 'PROPOSAL_STATUS_REJECTED').length.toString() || '0'
      }
    },
    {
      id: 'network',
      title: 'Network Health',
      value: `${blockHeight}`,
      subtitle: 'Current Block Height',
      icon: (
        <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      details: {
        'Block Height': blockHeight,
        'Chain ID': header?.result.header.chain_id || 'Unknown',
        'Block Time': header ? new Date(header.result.header.time).toLocaleString() : 'Unknown',
        'Proposer': header?.result.header.proposer_address ? 
          `${header.result.header.proposer_address.substring(0, 20)}...` : 'Unknown'
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={(event) => handleCardClick(card.id, event)}
            className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border border-gray-200 dark:border-dark-border hover:border-verana-accent relative z-10 self-start"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {card.icon}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {card.subtitle}
                  </p>
                </div>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${selectedCard === card.id ? 'rotate-180' : 'rotate-0'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {card.value}
            </div>
            
            {selectedCard === card.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                <div className="space-y-2">
                  {Object.entries(card.details).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:justify-between text-sm gap-1 sm:gap-0">
                      <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                      <span className="text-gray-900 dark:text-white font-mono break-all sm:break-normal">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Explore Verana Network
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link 
            href="/trust-registries"
            className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold">Trust Registries</h4>
                <p className="text-blue-100 text-sm">Explore and manage trust registries</p>
              </div>
            </div>
            <div className="flex items-center text-blue-100 group-hover:text-white transition-colors">
              <span className="text-sm font-medium">View Registries</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link 
            href="/did-directory"
            className="group bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold">DID Directory</h4>
                <p className="text-green-100 text-sm">Explore decentralized identifiers</p>
              </div>
            </div>
            <div className="flex items-center text-green-100 group-hover:text-white transition-colors">
              <span className="text-sm font-medium">Browse DIDs</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link 
            href="/network-graph"
            className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold">Network Graph</h4>
                <p className="text-purple-100 text-sm">Visualize network connections</p>
              </div>
            </div>
            <div className="flex items-center text-purple-100 group-hover:text-white transition-colors">
              <span className="text-sm font-medium">View Graph</span>
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {validators && validators.validators.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Validator Network
          </h3>
          <div className="space-y-4">
            {validators.validators.map((validator, index) => (
              <div key={validator.operator_address} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-dark-surface rounded-lg gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-verana-accent rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                      {validator.description.moniker}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                      {validator.operator_address}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end space-y-2">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {convertUvnaToVna(validator.tokens)} VNA
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Commission: {(parseFloat(validator.commission.commission_rates.rate) * 100).toFixed(1)}%
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full w-fit ${
                    validator.jailed 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : validator.status === 'BOND_STATUS_BONDED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {validator.jailed ? 'Jailed' : validator.status.replace('BOND_STATUS_', '').toLowerCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {proposals && proposals.proposals.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Proposals
          </h3>
          <div className="space-y-4">
            {proposals.proposals.slice(0, 3).map((proposal) => (
              <div key={proposal.id} className="p-4 bg-gray-50 dark:bg-dark-surface rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    #{proposal.id} - {proposal.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    proposal.status === 'PROPOSAL_STATUS_PASSED'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : proposal.status === 'PROPOSAL_STATUS_REJECTED'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : proposal.status === 'PROPOSAL_STATUS_VOTING_PERIOD'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {proposal.status.replace('PROPOSAL_STATUS_', '').toLowerCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {proposal.summary}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 dark:text-gray-400 gap-1 sm:gap-0">
                  <span className="break-all sm:break-normal">Proposer: {proposal.proposer.substring(0, 20)}...</span>
                  <span>Submitted: {new Date(proposal.submit_time).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
