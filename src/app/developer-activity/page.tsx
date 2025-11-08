'use client'

import { useState, useEffect } from 'react'
import LayoutWrapper from '@/components/LayoutWrapper'
import { RepositoryCard, ContributorsSection, SkeletonCard } from '@/components/developer-activity'
import { RepositoryStats, AggregatedContributor } from '@/types'
import { 
  fetchOrganizationRepos, 
  fetchRepositoryStats,
  aggregateContributors,
  hasGitHubToken 
} from '@/lib/githubApi'


// ⚠️ IMPORTANT: Update this with your actual GitHub organization name
// The organization "verana-labs" may not exist. Try testing with:
// - 'microsoft' - Microsoft's public repos
// - 'facebook' - Facebook's public repos  
// - 'vercel' - Vercel's public repos
// - Your own organization name
const ORGANIZATION = 'verana-labs'

export default function DeveloperActivityPage() {
  const [repoStats, setRepoStats] = useState<RepositoryStats[]>([])
  const [contributors, setContributors] = useState<AggregatedContributor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('Initializing...')
  const [error, setError] = useState<string | null>(null)
  const [totalRepos, setTotalRepos] = useState(0)

  const loadDeveloperActivity = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setLoadingProgress(0)
      setRepoStats([]) // Clear previous data
      setContributors([])

      console.log(`Fetching repositories from ${ORGANIZATION} organization...`)
      
      // Fetch all repositories
      setLoadingMessage('Fetching repositories...')
      setLoadingProgress(10)
      const repos = await fetchOrganizationRepos(ORGANIZATION)
      
      if (repos.length === 0) {
        throw new Error('No repositories found for the organization')
      }

      console.log(`Found ${repos.length} repositories`)
      setTotalRepos(repos.length)
      setLoadingProgress(20)
      
      // Progressive loading: Show repos as they load
      setLoadingMessage(`Loading ${repos.length} repositories...`)
      const validStats: RepositoryStats[] = []
      
      // Process repos in batches for better UX (larger batches = faster but uses more rate limit)
      const batchSize = 5 // Fetch 5 repos at a time
      for (let i = 0; i < repos.length; i += batchSize) {
        const batch = repos.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(repos.length / batchSize)
        setLoadingMessage(`Loading batch ${batchNumber}/${totalBatches} (${batch.length} repos)...`)
        
        // Fetch batch in parallel
        const batchPromises = batch.map(repo => 
          fetchRepositoryStats(repo.owner.login, repo.name)
        )
        const batchStats = await Promise.all(batchPromises)
        
        // Add valid stats to array
        batchStats.forEach(stat => {
          if (stat) {
            validStats.push(stat)
          }
        })
        
        // Update progress and show partial results
        const progress = 20 + ((i + batch.length) / repos.length) * 70
        setLoadingProgress(progress)
        
        // Sort and update UI progressively
        const sortedStats = [...validStats].sort((a, b) => b.commitsThisMonth - a.commitsThisMonth)
        setRepoStats(sortedStats)
        
        // Aggregate contributors progressively
        const partialContributors = aggregateContributors(sortedStats)
        setContributors(partialContributors)
      }
      
      console.log(`Successfully fetched stats for ${validStats.length} repositories`)
      
      setLoadingProgress(100)
      setLoadingMessage('Complete!')
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load developer activity'
      setError(errorMessage)
      console.error('Error loading developer activity:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Log token status for debugging
    console.log('Token configured:', hasGitHubToken())
    console.log('Organization to fetch:', ORGANIZATION)
    loadDeveloperActivity()
  }, [])

  // Calculate overall statistics
  const totalCommits = repoStats.reduce((sum, repo) => sum + repo.totalCommits, 0)
  const totalStars = repoStats.reduce((sum, repo) => sum + repo.stars, 0)
  const activeRepos = repoStats.filter(repo => repo.commitsThisMonth > 0).length

  return (
    <LayoutWrapper 
      title="Developer Activity" 
      subtitle="Real-time GitHub Activity from Verana Labs"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Developer Activity
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Real-time development activity from {ORGANIZATION} with 12-week commit graphs
              </p>
            </div>
            {!isLoading && !error && (
              <button
                onClick={loadDeveloperActivity}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-verana-accent hover:bg-opacity-90 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-red-600 dark:text-red-400 font-medium">Error loading data</p>
                  <div className="text-red-600 dark:text-red-400 text-sm mt-1 whitespace-pre-line">
                    {error}
                  </div>
                  {(error.includes('not found') || error.includes('forbidden') || error.includes('403')) && (
                    <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">
                        💡 Quick Fixes:
                      </p>
                      <ul className="text-red-600 dark:text-red-400 text-xs space-y-1 list-disc list-inside">
                        <li>
                          Verify the organization name: Update <code className="bg-red-200 dark:bg-red-800 px-1 py-0.5 rounded">ORGANIZATION</code> in{' '}
                          <code className="bg-red-200 dark:bg-red-800 px-1 py-0.5 rounded">page.tsx</code> (currently: &quot;{ORGANIZATION}&quot;)
                        </li>
                        <li>
                          Try a known organization like &quot;microsoft&quot;, &quot;facebook&quot;, or &quot;vercel&quot;
                        </li>
                        {!hasGitHubToken() && (
                          <li>
                            Add a GitHub token to access more organizations (see GITHUB_TOKEN_SETUP.md)
                          </li>
                        )}
                        {hasGitHubToken() && (
                          <li>
                            Check your token at{' '}
                            <a 
                              href="https://github.com/settings/tokens" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:no-underline"
                            >
                              github.com/settings/tokens
                            </a>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={loadDeveloperActivity}
                    className="mt-3 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State - Compact when showing partial results */}
          {isLoading && (
            <div className={`mt-4 rounded-lg transition-all duration-300 ${
              repoStats.length > 0 
                ? 'p-3 bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50' 
                : 'p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className={`text-blue-700 dark:text-blue-300 truncate ${
                    repoStats.length > 0 ? 'text-sm' : 'font-medium'
                  }`}>
                    {loadingMessage}
                  </p>
                  {repoStats.length === 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Batching requests for optimal performance...
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-32 bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${loadingProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300 tabular-nums">
                    {Math.round(loadingProgress)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Summary Cards */}
        {!isLoading && !error && repoStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Commits */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium mb-1">Total Commits (90d)</p>
                  <p className="text-3xl font-bold">{totalCommits.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Repositories */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-1">Active Repositories</p>
                  <p className="text-3xl font-bold">{activeRepos} / {repoStats.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total Contributors */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium mb-1">Total Contributors</p>
                  <p className="text-3xl font-bold">{contributors.length}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Repository Cards Grid */}
        {!error && (isLoading || repoStats.length > 0) && (
          <>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-verana-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
                Repositories
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {isLoading && totalRepos > 0 
                  ? `Loading ${repoStats.length} of ${totalRepos} repositories...` 
                  : `${repoStats.length} repositories sorted by recent activity`}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-start">
              {/* Show loaded repositories */}
              {repoStats.map((repo) => (
                <RepositoryCard key={repo.name} repo={repo} />
              ))}
              
              {/* Show skeleton cards for remaining repos while loading */}
              {isLoading && totalRepos > repoStats.length && (
                <>
                  {Array.from({ length: Math.min(6, totalRepos - repoStats.length) }).map((_, idx) => (
                    <SkeletonCard key={`skeleton-${idx}`} />
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {/* Contributors Section */}
        {!isLoading && !error && contributors.length > 0 && (
          <ContributorsSection contributors={contributors} />
        )}

        {/* Empty State */}
        {!isLoading && !error && repoStats.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No repository data available
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Unable to load repository information at this time.
            </p>
          </div>
        )}
      </div>
    </LayoutWrapper>
  )
}

