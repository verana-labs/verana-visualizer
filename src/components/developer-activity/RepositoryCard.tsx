'use client'

import { useState } from 'react'
import { RepositoryStats } from '@/types'
import { formatNumber, formatRelativeTime, formatCommitActivityForChart } from '@/lib/githubApi'
import CommitActivityChart from './CommitActivityChart'

interface RepositoryCardProps {
  repo: RepositoryStats
}

export default function RepositoryCard({ repo }: RepositoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(true) // Show graphs by default

  const chartData = formatCommitActivityForChart(repo.commitActivity)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <a 
              href={repo.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-verana-accent dark:hover:text-verana-accent transition-colors inline-flex items-center gap-2"
            >
              {repo.name}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {repo.language && (
              <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                {repo.language}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {repo.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {repo.description}
          </p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Stars */}
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {formatNumber(repo.stars)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">stars</span>
          </div>

          {/* Forks */}
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {formatNumber(repo.forks)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">forks</span>
          </div>

          {/* Total Commits (last 30 days) */}
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {repo.totalCommits}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">commits</span>
          </div>

          {/* Contributors */}
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {repo.contributors.length}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-xs">contributors</span>
          </div>
        </div>

        {/* Commit Breakdown */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">This Week:</span>
              <span className="ml-2 font-semibold text-blue-600 dark:text-blue-400">
                {repo.commitsThisWeek} commits
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">This Month:</span>
              <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                {repo.commitsThisMonth} commits
              </span>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <span>Updated {formatRelativeTime(repo.lastUpdated)}</span>
        </div>

        {/* Collapse Button (graphs shown by default) */}
        {chartData.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            {isExpanded ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Hide Graph
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Show Graph
              </>
            )}
          </button>
        )}
      </div>

      {/* Chart Section - Animated */}
      <div className={`border-t border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[400px] opacity-100' : 'max-h-12 opacity-100'
      }`}>
        {isExpanded && chartData.length > 0 ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
            <CommitActivityChart 
              data={chartData} 
              repoName={repo.name}
            />
          </div>
        ) : chartData.length > 0 ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Commit activity graph hidden
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

