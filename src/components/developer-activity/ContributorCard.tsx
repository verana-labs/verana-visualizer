'use client'

import Image from 'next/image'
import { AggregatedContributor } from '@/types'
import { getContributionLevel } from '@/lib/githubApi'

interface ContributorCardProps {
  contributor: AggregatedContributor
}

export default function ContributorCard({ contributor }: ContributorCardProps) {
  const { level, color } = getContributionLevel(contributor.totalContributions)

  return (
    <a
      href={contributor.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:scale-105 transition-all duration-200 group"
    >
      <div className="flex flex-col items-center">
        {/* Avatar */}
        <div className="relative w-16 h-16 mb-3">
          <Image
            src={contributor.avatar_url}
            alt={contributor.login}
            width={64}
            height={64}
            className="rounded-full ring-2 ring-gray-200 dark:ring-gray-700 group-hover:ring-verana-accent transition-all"
          />
        </div>

        {/* Username */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 text-center group-hover:text-verana-accent transition-colors">
          {contributor.login}
        </h3>

        {/* Contribution Badge */}
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mb-2 ${color}`}>
          {level} Contributor
        </span>

        {/* Stats */}
        <div className="w-full space-y-2">
          {/* Total Contributions */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Contributions:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {contributor.totalContributions}
            </span>
          </div>

          {/* Repositories */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Repositories:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {contributor.repositories.length}
            </span>
          </div>
        </div>

        {/* Repository List (Tooltip on hover) */}
        {contributor.repositories.length > 0 && (
          <div className="mt-2 w-full">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              <details className="group/details">
                <summary className="cursor-pointer hover:text-verana-accent transition-colors list-none">
                  View repos ({contributor.repositories.length})
                  <span className="inline-block ml-1 transform group-open/details:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-left max-h-32 overflow-y-auto">
                  {contributor.repositories.map((repo, idx) => (
                    <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 py-0.5">
                      • {repo}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </a>
  )
}

