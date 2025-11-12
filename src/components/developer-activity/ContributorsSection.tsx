'use client'

import { useState } from 'react'
import { AggregatedContributor } from '@/types'
import ContributorCard from './ContributorCard'

interface ContributorsSectionProps {
  contributors: AggregatedContributor[]
}

export default function ContributorsSection({ contributors }: ContributorsSectionProps) {
  const [showAll, setShowAll] = useState(false)
  const displayLimit = 12

  if (!contributors || contributors.length === 0) {
    return null
  }

  const displayedContributors = showAll 
    ? contributors 
    : contributors.slice(0, displayLimit)

  const hasMore = contributors.length > displayLimit

  return (
    <div className="mt-8">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-verana-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Top Contributors
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          {contributors.length} developer{contributors.length !== 1 ? 's' : ''} contributing across all repositories
        </p>
      </div>

      {/* Contributors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {displayedContributors.map((contributor) => (
          <ContributorCard 
            key={contributor.login} 
            contributor={contributor} 
          />
        ))}
      </div>

      {/* Show More/Less Button */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="px-6 py-3 text-sm font-medium text-white bg-verana-accent hover:bg-opacity-90 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
          >
            {showAll ? (
              <>
                Show Less
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Show All {contributors.length} Contributors
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

