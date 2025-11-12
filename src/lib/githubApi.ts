import {
  GitHubRepository,
  GitHubContributor,
  GitHubCommit,
  CommitActivity,
  RepositoryStats,
  AggregatedContributor,
  GitHubApiError
} from '@/types'

const GITHUB_API_BASE = 'https://api.github.com'

// Get GitHub token from environment variable
const GITHUB_TOKEN = process.env.NEXT_PUBLIC_GITHUB_TOKEN

// Rate limit warning
let hasWarnedAboutRateLimit = false

function warnAboutRateLimit() {
  if (!hasWarnedAboutRateLimit) {
    if (GITHUB_TOKEN) {
      console.log(
        '✅ GitHub API: Using authenticated requests (5,000 requests/hour limit)'
      )
    } else {
      console.warn(
        '⚠️ GitHub API: Using unauthenticated requests (60 requests/hour limit). ' +
        'Add NEXT_PUBLIC_GITHUB_TOKEN to .env.local for higher limits (5,000 requests/hour).'
      )
    }
    hasWarnedAboutRateLimit = true
  }
}

/**
 * Get headers for GitHub API requests
 */
function getGitHubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  }
  
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`
  }
  
  return headers
}

/**
 * Check if GitHub token is configured
 */
export function hasGitHubToken(): boolean {
  return !!GITHUB_TOKEN
}

/**
 * Fetch all public repositories from an organization
 */
export async function fetchOrganizationRepos(org: string): Promise<GitHubRepository[]> {
  warnAboutRateLimit()
  
  try {
    const response = await fetch(`${GITHUB_API_BASE}/orgs/${org}/repos?per_page=100&sort=updated`, {
      headers: getGitHubHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Organization "${org}" not found on GitHub. Please verify the organization name.`)
      }
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
        const rateLimitReset = response.headers.get('X-RateLimit-Reset')
        const resetDate = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : null
        const resetTimeStr = resetDate ? resetDate.toLocaleTimeString() : 'unknown'
        
        console.error('GitHub API 403 Error Details:', {
          rateLimitRemaining,
          rateLimitReset,
          resetTime: resetTimeStr,
          hasToken: !!GITHUB_TOKEN,
          org
        })
        
        if (rateLimitRemaining === '0') {
          throw new Error(
            `GitHub API rate limit exceeded. Limit resets at ${resetTimeStr}. ` +
            `${GITHUB_TOKEN ? 'Token is configured but limit still hit.' : 'Add a GitHub token to increase limits from 60 to 5,000 requests/hour.'}`
          )
        }
        
        // If not rate limit, might be invalid token or private org
        if (GITHUB_TOKEN) {
          throw new Error(
            `Access forbidden (403). This could mean:\n` +
            `• Your GitHub token may be invalid or expired\n` +
            `• The organization "${org}" might be private\n` +
            `• The token lacks required permissions (needs 'public_repo' scope)\n` +
            `Please verify your token at: https://github.com/settings/tokens`
          )
        } else {
          throw new Error(
            `Access forbidden (403). The organization "${org}" might not exist or is private. ` +
            `Try adding a GitHub token to access more organizations.`
          )
        }
      }
      throw new Error(`Failed to fetch repositories (${response.status}): ${response.statusText}`)
    }

    const repos: GitHubRepository[] = await response.json()
    // Filter out private repos and forks (external repositories)
    return repos.filter(repo => !repo.name.includes('private') && !repo.fork)
  } catch (error) {
    console.error('Error fetching organization repos:', error)
    throw error
  }
}

/**
 * Fetch commits for a repository
 */
export async function fetchRepositoryCommits(
  owner: string,
  repo: string,
  since?: string
): Promise<GitHubCommit[]> {
  try {
    const sinceParam = since ? `&since=${since}` : ''
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=100${sinceParam}`,
      {
        headers: getGitHubHeaders(),
      }
    )

    if (!response.ok) {
      if (response.status === 409) {
        // Repository is empty
        return []
      }
      throw new Error(`Failed to fetch commits: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error)
    return []
  }
}

/**
 * Fetch contributors for a repository
 */
export async function fetchRepositoryContributors(
  owner: string,
  repo: string
): Promise<GitHubContributor[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/contributors?per_page=100`,
      {
        headers: getGitHubHeaders(),
      }
    )

    if (!response.ok) {
      if (response.status === 409 || response.status === 404) {
        // Repository is empty or not found
        console.log(`No contributors found for ${owner}/${repo} (${response.status})`)
        return []
      }
      if (response.status === 403) {
        console.warn(`Rate limit or access denied for ${owner}/${repo}`)
        return []
      }
      console.warn(`Failed to fetch contributors for ${owner}/${repo}: ${response.statusText}`)
      return []
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching contributors for ${owner}/${repo}:`, error)
    return []
  }
}

/**
 * Fetch commit activity statistics for a repository (weekly data)
 */
export async function fetchCommitActivity(
  owner: string,
  repo: string
): Promise<CommitActivity[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/stats/commit_activity`,
      {
        headers: getGitHubHeaders(),
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    
    // GitHub returns 202 if stats are being computed
    if (response.status === 202) {
      console.log(`Stats are being computed for ${owner}/${repo}`)
      return []
    }

    return data || []
  } catch (error) {
    console.error(`Error fetching commit activity for ${owner}/${repo}:`, error)
    return []
  }
}

/**
 * Calculate commit statistics from a list of commits
 */
export function calculateCommitStats(commits: GitHubCommit[]): {
  total: number
  thisWeek: number
  thisMonth: number
} {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const thisWeek = commits.filter(commit => {
    const commitDate = new Date(commit.commit.author.date)
    return commitDate >= oneWeekAgo
  }).length

  const thisMonth = commits.filter(commit => {
    const commitDate = new Date(commit.commit.author.date)
    return commitDate >= oneMonthAgo
  }).length

  return {
    total: commits.length,
    thisWeek,
    thisMonth,
  }
}

/**
 * Convert commits array into weekly activity data (fallback when stats API fails)
 */
export function generateCommitActivityFromCommits(commits: GitHubCommit[]): CommitActivity[] {
  // Get the last 12 weeks
  const now = new Date()
  const weeklyData: { [key: number]: number } = {}
  
  // Initialize all 12 weeks with zero commits
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setMinutes(0, 0, 0)
    const weekTimestamp = Math.floor(weekStart.getTime() / 1000)
    weeklyData[weekTimestamp] = 0
  }
  
  // Count commits per week (if any)
  if (commits.length > 0) {
    const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
    
    commits.forEach(commit => {
      const commitDate = new Date(commit.commit.author.date)
      if (commitDate >= twelveWeeksAgo) {
        // Find which week this commit belongs to
        const weekIndex = Math.floor((now.getTime() - commitDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weekIndex >= 0 && weekIndex < 12) {
          const weekStart = new Date(now.getTime() - weekIndex * 7 * 24 * 60 * 60 * 1000)
          weekStart.setHours(0, 0, 0, 0)
          weekStart.setMinutes(0, 0, 0)
          const weekTimestamp = Math.floor(weekStart.getTime() / 1000)
          if (weeklyData[weekTimestamp] !== undefined) {
            weeklyData[weekTimestamp] += 1
          }
        }
      }
    })
  }
  
  // Convert to CommitActivity format, sorted chronologically
  return Object.keys(weeklyData)
    .map(timestamp => ({
      week: parseInt(timestamp),
      total: weeklyData[parseInt(timestamp)],
      days: [0, 0, 0, 0, 0, 0, 0], // Not used for display
    }))
    .sort((a, b) => a.week - b.week)
}

/**
 * Format commit activity data for charts
 */
export function formatCommitActivityForChart(activity: CommitActivity[]): Array<{
  week: string
  commits: number
}> {
  if (!activity || activity.length === 0) return []
  
  // Get the last 12 weeks
  const lastTwelveWeeks = activity.slice(-12)
  
  return lastTwelveWeeks.map(week => {
    const date = new Date(week.week * 1000)
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
    
    return {
      week: formattedDate,
      commits: week.total,
    }
  })
}

/**
 * Fetch comprehensive stats for a repository
 */
export async function fetchRepositoryStats(
  owner: string,
  repo: string
): Promise<RepositoryStats | null> {
  try {
    // Fetch repository details
    const repoResponse = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: getGitHubHeaders(),
    })

    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository details: ${repoResponse.statusText}`)
    }

    const repoData: GitHubRepository = await repoResponse.json()

    // Fetch commits (last 90 days for better graph coverage)
    // Limiting to 100 per_page is already in fetchRepositoryCommits
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const commits = await fetchRepositoryCommits(owner, repo, ninetyDaysAgo)
    const commitStats = calculateCommitStats(commits)
    
    // Fetch contributors and commit activity in parallel for speed
    const [contributors, commitActivityResult] = await Promise.all([
      fetchRepositoryContributors(owner, repo),
      fetchCommitActivity(owner, repo)
    ])

    // Use commit activity from parallel fetch
    let commitActivity = commitActivityResult
    
    // Fallback: If GitHub stats API doesn't return data, generate from commits
    if (!commitActivity || commitActivity.length === 0) {
      console.log(`Generating commit activity from commits for ${owner}/${repo}`)
      commitActivity = generateCommitActivityFromCommits(commits)
    }

    return {
      name: repoData.name,
      description: repoData.description,
      url: repoData.html_url,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      totalCommits: commitStats.total,
      commitsThisWeek: commitStats.thisWeek,
      commitsThisMonth: commitStats.thisMonth,
      lastUpdated: repoData.updated_at,
      contributors,
      commitActivity,
    }
  } catch (error) {
    console.error(`Error fetching repository stats for ${owner}/${repo}:`, error)
    return null
  }
}

/**
 * Aggregate contributors from multiple repositories
 */
export function aggregateContributors(
  repoStats: RepositoryStats[]
): AggregatedContributor[] {
  const contributorMap = new Map<string, AggregatedContributor>()

  repoStats.forEach(repo => {
    repo.contributors.forEach(contributor => {
      const existing = contributorMap.get(contributor.login)
      
      if (existing) {
        existing.totalContributions += contributor.contributions
        existing.repositories.push(repo.name)
      } else {
        contributorMap.set(contributor.login, {
          login: contributor.login,
          avatar_url: contributor.avatar_url,
          html_url: contributor.html_url,
          totalContributions: contributor.contributions,
          repositories: [repo.name],
        })
      }
    })
  })

  // Convert to array and sort by contributions
  return Array.from(contributorMap.values())
    .sort((a, b) => b.totalContributions - a.totalContributions)
}

/**
 * Get contribution level badge
 */
export function getContributionLevel(contributions: number): {
  level: string
  color: string
} {
  if (contributions >= 100) {
    return { level: 'High', color: 'text-green-600 bg-green-100 dark:bg-green-900/30' }
  } else if (contributions >= 20) {
    return { level: 'Medium', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' }
  } else {
    return { level: 'Low', color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30' }
  }
}

/**
 * Format large numbers (stars, forks, etc.)
 */
export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

/**
 * Format date to relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'today'
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffDays / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}

