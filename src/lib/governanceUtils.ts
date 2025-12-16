/**
 * Governance Utilities
 * 
 * BigInt-safe arithmetic and helper functions for governance proposal processing.
 * This module handles vote counting, turnout calculations, and execution time logic
 * as specified in the Governance Proposal Upgrade Widget Spec.
 */

import {
  Proposal,
  UpgradePlan,
  UpgradeExecutionInfo,
  UpgradeExecutionStatus,
  VotingSummary,
  UpgradeProposalData,
  ParsedPlanInfo,
  UpgradeBinaries
} from '@/types'
import { fetchBlockAtHeight, fetchCurrentHeight, fetchStakingPool } from './api'

// ============================================
// Constants
// ============================================

const UPGRADE_MESSAGE_TYPE = '/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade'
const PROPOSAL_STATUS_PASSED = 'PROPOSAL_STATUS_PASSED'

// ============================================
// Proposal Detection
// ============================================

/**
 * Check if a proposal is an upgrade proposal
 * A proposal qualifies as an upgrade proposal if any message satisfies:
 * proposal.messages[i].type == "/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade"
 */
export function isUpgradeProposal(proposal: Proposal): boolean {
  if (!proposal.messages || proposal.messages.length === 0) {
    return false
  }

  return proposal.messages.some(msg => {
    const msgType = msg['@type'] || ''
    return msgType === UPGRADE_MESSAGE_TYPE || msgType.includes('MsgSoftwareUpgrade')
  })
}

/**
 * Get the first upgrade message from a proposal (MVP rule)
 */
export function getUpgradeMessage(proposal: Proposal) {
  if (!proposal.messages || proposal.messages.length === 0) {
    return null
  }

  return proposal.messages.find(msg => {
    const msgType = msg['@type'] || ''
    return msgType === UPGRADE_MESSAGE_TYPE || msgType.includes('MsgSoftwareUpgrade')
  }) || null
}

/**
 * Extract upgrade plan from proposal message
 */
export function extractUpgradePlan(proposal: Proposal): UpgradePlan | undefined {
  const upgradeMessage = getUpgradeMessage(proposal)
  if (!upgradeMessage?.plan) {
    return undefined
  }

  return {
    name: upgradeMessage.plan.name || '',
    height: upgradeMessage.plan.height || '',
    time: upgradeMessage.plan.time || '',
    info: upgradeMessage.plan.info || '',
    upgraded_client_state: upgradeMessage.plan.upgraded_client_state
  }
}

/**
 * Fix binary URL format
 * Transforms: https://github.com/.../releases/download/v0.9-dev.7/veranad-v0.9-dev.7-linux-arm64
 * To: https://github.com/.../releases/download/v0.9-dev.7/veranad-linux-arm64
 * 
 * The correct format is: veranad-{platform} (e.g., veranad-linux-amd64)
 * Invalid format includes version in filename: veranad-{version}-{platform}
 */
function fixBinaryUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url
  }

  try {
    // Match GitHub release URL pattern
    const match = url.match(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+\/releases\/download\/)([^\/]+)\/(.+)$/)
    if (!match) {
      return url // Not a GitHub release URL, return as-is
    }

    const [, basePath, version, filename] = match

    // Check if filename already matches correct format (veranad-{platform})
    // Platform should start with linux- or darwin-
    if (filename.match(/^veranad-(linux|darwin)-/)) {
      return url // Already in correct format
    }

    // Extract platform from filename with version
    // Pattern: veranad-{version}-{platform} -> veranad-{platform}
    // Example: veranad-v0.9-dev.7-linux-arm64 -> veranad-linux-arm64
    // Use non-greedy matching to find -linux- or -darwin- after version
    const platformMatch = filename.match(/^veranad-.*?(-(?:linux|darwin)-.+)$/)
    if (platformMatch) {
      const platformPart = platformMatch[1].substring(1) // Remove leading dash
      const fixedFilename = `veranad-${platformPart}`
      return `${basePath}${version}/${fixedFilename}`
    }

    // If filename doesn't match expected pattern, return as-is
    return url
  } catch {
    return url
  }
}

/**
 * Parse plan.info JSON field safely and fix binary URLs
 */
export function parsePlanInfo(infoString: string): ParsedPlanInfo | undefined {
  if (!infoString || typeof infoString !== 'string') {
    return undefined
  }

  try {
    const parsed = JSON.parse(infoString)
    
    // Fix binary URLs if they exist
    if (parsed.binaries && typeof parsed.binaries === 'object') {
      const fixedBinaries: Record<string, string | undefined> = {}
      for (const [key, value] of Object.entries(parsed.binaries)) {
        if (typeof value === 'string') {
          fixedBinaries[key] = fixBinaryUrl(value)
        } else {
          fixedBinaries[key] = value as string | undefined
        }
      }
      parsed.binaries = fixedBinaries
    }
    
    return parsed as ParsedPlanInfo
  } catch {
    // If not valid JSON, return undefined
    return undefined
  }
}

/**
 * Extract binary version from plan info or URL
 */
export function extractBinaryVersion(plan: UpgradePlan, proposalTitle?: string): string | null {
  // First, try to get version from plan name
  let version: string | null = plan.name || null

  // Try to parse plan.info for binaries
  const parsedInfo = parsePlanInfo(plan.info)
  if (parsedInfo?.binaries) {
    // Get the first available binary URL
    const binaries = parsedInfo.binaries as UpgradeBinaries
    const binaryUrl = 
      binaries['linux/amd64'] || 
      binaries['linux/arm64'] || 
      binaries['darwin/amd64'] ||
      binaries['darwin/arm64'] ||
      Object.values(binaries).find(v => v)

    if (binaryUrl && typeof binaryUrl === 'string') {
      // Extract version from URL pattern
      const versionMatch = 
        binaryUrl.match(/\/releases\/download\/(v[\d.]+(?:-[a-z]+\.\d+)?)/i) ||
        binaryUrl.match(/veranad-(v[\d.]+(?:-[a-z]+\.\d+)?)/i) ||
        binaryUrl.match(/(v[\d.]+(?:-[a-z]+\.\d+)?)/i)

      if (versionMatch?.[1]) {
        version = versionMatch[1]
      }
    }
  } else if (parsedInfo?.version) {
    version = parsedInfo.version
  } else if (parsedInfo?.binary) {
    version = parsedInfo.binary
  }

  // Fallback: Try to extract version from proposal title
  if (!version && proposalTitle) {
    const titleVersionMatch = proposalTitle.match(/(v[\d.]+(?:-[a-z]+\.\d+)?)/i)
    if (titleVersionMatch?.[1]) {
      version = titleVersionMatch[1]
    }
  }

  return version
}

// ============================================
// BigInt-Safe Vote Calculations
// ============================================

/**
 * Safe addition of vote strings using BigInt
 * CRITICAL: Do not use Number for large vote counts
 */
export function safeBigIntAdd(...values: string[]): bigint {
  return values.reduce((sum, val) => {
    const parsed = BigInt(val || '0')
    return sum + parsed
  }, BigInt(0))
}

/**
 * Calculate total voting power from tally result
 * totalVotingPower = yes + no + abstain + no_with_veto
 */
export function calculateTotalVotingPower(tally: {
  yes_count: string
  no_count: string
  abstain_count: string
  no_with_veto_count: string
}): string {
  const total = safeBigIntAdd(
    tally.yes_count,
    tally.no_count,
    tally.abstain_count,
    tally.no_with_veto_count
  )
  return total.toString()
}

/**
 * Calculate turnout percentage
 * turnoutPercent = 100 * totalVotingPower / bondedTokens
 * Uses BigInt-safe arithmetic, returns string with 2-4 decimal places
 */
export function calculateTurnoutPercent(
  totalVotingPower: string,
  bondedTokens: string
): string {
  if (!bondedTokens || bondedTokens === '0') {
    return 'N/A'
  }

  try {
    const votingPower = BigInt(totalVotingPower || '0')
    const bonded = BigInt(bondedTokens)

    if (bonded === BigInt(0)) {
      return 'N/A'
    }

    // Calculate with 6 decimal precision (multiply by 10^8 for percentage with decimals)
    const scaleFactor = BigInt(100000000) // 10^8 for percentage * 10^6 precision
    const turnoutScaled = (votingPower * scaleFactor) / bonded

    // Convert to number for final formatting (safe since it's a percentage 0-100)
    const turnoutPercent = Number(turnoutScaled) / 1000000

    // Format to 2-4 decimal places
    if (turnoutPercent >= 10) {
      return turnoutPercent.toFixed(2)
    } else if (turnoutPercent >= 1) {
      return turnoutPercent.toFixed(3)
    } else {
      return turnoutPercent.toFixed(4)
    }
  } catch {
    return 'N/A'
  }
}

// ============================================
// Execution Time Logic
// ============================================

/**
 * Determine upgrade execution status and time
 * Implements the rules from the spec:
 * 
 * 1. If proposalStatus != PROPOSAL_STATUS_PASSED:
 *    → not executed (proposal status: <STATUS>; target height <planHeight>)
 * 
 * 2. If proposalStatus == PROPOSAL_STATUS_PASSED and currentHeight is numeric:
 *    - If planHeight <= currentHeight: Query block at planHeight for execution time
 *    - Else: not executed (target height <planHeight>; current height <currentHeight>)
 * 
 * 3. If currentHeight unavailable:
 *    → not executed (target height <planHeight>; current height unknown)
 */
export async function determineUpgradeExecutionStatus(
  proposal: Proposal,
  planHeight: string
): Promise<UpgradeExecutionInfo> {
  // Rule 1: Proposal not passed
  if (proposal.status !== PROPOSAL_STATUS_PASSED) {
    return {
      status: 'not_executed',
      message: `Not executed (proposal status: ${proposal.status.replace('PROPOSAL_STATUS_', '')}; target height ${planHeight})`,
      planHeight
    }
  }

  // Get current chain height
  let currentHeight: string | undefined
  try {
    currentHeight = await fetchCurrentHeight()
  } catch (error) {
    console.error('Error fetching current height:', error)
    // Rule 3: Current height unavailable
    return {
      status: 'not_executed',
      message: `Not executed (target height ${planHeight}; current height unknown)`,
      planHeight,
      currentHeight: undefined
    }
  }

  const planHeightNum = parseInt(planHeight, 10)
  const currentHeightNum = parseInt(currentHeight, 10)

  // Check if heights are valid numbers
  if (isNaN(planHeightNum) || isNaN(currentHeightNum)) {
    return {
      status: 'unknown',
      message: `Unknown (invalid height values)`,
      planHeight,
      currentHeight
    }
  }

  // Rule 2a: Plan height <= current height → upgrade should be executed
  if (planHeightNum <= currentHeightNum) {
    try {
      const blockData = await fetchBlockAtHeight(planHeight)
      const executionTime = blockData.result?.block?.header?.time

      if (executionTime) {
        return {
          status: 'executed',
          executedAt: executionTime,
          message: `Executed at block ${planHeight}`,
          planHeight,
          currentHeight
        }
      } else {
        return {
          status: 'unknown',
          message: `Unknown (block data not available)`,
          planHeight,
          currentHeight
        }
      }
    } catch (error) {
      console.error(`Error fetching block at height ${planHeight}:`, error)
      return {
        status: 'unknown',
        message: `Unknown (block not available)`,
        planHeight,
        currentHeight
      }
    }
  }

  // Rule 2b: Plan height > current height → not yet executed
  return {
    status: 'pending',
    message: `Not executed (target height ${planHeight}; current height ${currentHeight})`,
    planHeight,
    currentHeight
  }
}

// ============================================
// Voting Summary
// ============================================

/**
 * Build voting summary with all derived metrics
 */
export async function buildVotingSummary(proposal: Proposal): Promise<VotingSummary> {
  const tally = proposal.final_tally_result

  const yesCount = tally.yes_count || '0'
  const noCount = tally.no_count || '0'
  const abstainCount = tally.abstain_count || '0'
  const noWithVetoCount = tally.no_with_veto_count || '0'

  const totalVotingPower = calculateTotalVotingPower(tally)

  // Get bonded tokens for turnout calculation
  let bondedTokens = '0'
  try {
    const stakingPool = await fetchStakingPool()
    bondedTokens = stakingPool.pool?.bonded_tokens || '0'
  } catch (error) {
    console.error('Error fetching staking pool:', error)
  }

  const turnoutPercent = calculateTurnoutPercent(totalVotingPower, bondedTokens)

  return {
    yesCount,
    noCount,
    abstainCount,
    noWithVetoCount,
    totalVotingPower,
    bondedTokens,
    turnoutPercent
  }
}

// ============================================
// Complete Upgrade Proposal Data
// ============================================

/**
 * Build complete upgrade proposal data structure
 * Combines all derived metrics and execution info
 */
export async function buildUpgradeProposalData(
  proposal: Proposal
): Promise<UpgradeProposalData> {
  const isUpgrade = isUpgradeProposal(proposal)
  const upgradeMessage = getUpgradeMessage(proposal)
  const plan = extractUpgradePlan(proposal)
  const parsedPlanInfo = plan?.info ? parsePlanInfo(plan.info) : undefined

  // Get execution info
  let execution: UpgradeExecutionInfo
  if (isUpgrade && plan?.height) {
    execution = await determineUpgradeExecutionStatus(proposal, plan.height)
  } else {
    execution = {
      status: 'not_executed',
      message: 'Not an upgrade proposal',
      planHeight: '0'
    }
  }

  // Get voting summary
  const voting = await buildVotingSummary(proposal)

  return {
    proposal,
    isUpgradeProposal: isUpgrade,
    plan,
    authority: upgradeMessage?.authority,
    messageType: upgradeMessage?.['@type'],
    parsedPlanInfo,
    execution,
    voting
  }
}

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format proposal status for display
 */
export function formatProposalStatus(status: string): string {
  return status.replace('PROPOSAL_STATUS_', '').toLowerCase().replace(/_/g, ' ')
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return timestamp
  }
}

/**
 * Format date for display
 */
export function formatDate(timestamp: string): string {
  try {
    return new Date(timestamp).toLocaleDateString()
  } catch {
    return timestamp
  }
}

/**
 * Format large numbers with commas
 */
export function formatNumber(value: string | number): string {
  try {
    const num = typeof value === 'string' ? parseInt(value, 10) : value
    return num.toLocaleString()
  } catch {
    return value.toString()
  }
}

/**
 * Convert uvna to VNA (divide by 10^6)
 */
export function formatVnaAmount(uvna: string): string {
  try {
    const amount = BigInt(uvna || '0')
    const vna = Number(amount) / 1000000
    return vna.toLocaleString(undefined, { maximumFractionDigits: 2 })
  } catch {
    return '0'
  }
}

/**
 * Get execution status badge color
 */
export function getExecutionStatusColor(status: UpgradeExecutionStatus): {
  bg: string
  text: string
  darkBg: string
  darkText: string
} {
  switch (status) {
    case 'executed':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        darkBg: 'dark:bg-green-900',
        darkText: 'dark:text-green-200'
      }
    case 'pending':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        darkBg: 'dark:bg-blue-900',
        darkText: 'dark:text-blue-200'
      }
    case 'not_executed':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        darkBg: 'dark:bg-yellow-900',
        darkText: 'dark:text-yellow-200'
      }
    case 'unknown':
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        darkBg: 'dark:bg-gray-700',
        darkText: 'dark:text-gray-200'
      }
  }
}

