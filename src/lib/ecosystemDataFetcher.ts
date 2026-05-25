import { logger } from '@/lib/logger'

import { EcosystemMetricsDataPoint } from '@/types'
import { fetchEcosystemMetrics } from './api'
import { calculateHistoricalHeights, getBlockAtHeight, getCurrentBlockHeight } from './historicalDataFetcher'

export async function fetchHistoricalEcosystemData(dataPoints: number = 30): Promise<EcosystemMetricsDataPoint[]> {
  const currentHeight = await getCurrentBlockHeight()
  const heights = calculateHistoricalHeights(currentHeight, dataPoints)

  const data: EcosystemMetricsDataPoint[] = []
  let failureCount = 0
  const batchSize = 5

  for (let i = 0; i < heights.length; i += batchSize) {
    const batch = heights.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(async (height) => {
        let blockInfo: Awaited<ReturnType<typeof getBlockAtHeight>>
        try {
          blockInfo = await getBlockAtHeight(height)
        } catch (err) {
          logger.warn(`Block fetch at height ${height} failed, skipping:`, err instanceof Error ? err.message : err)
          return null
        }

        let metrics: Awaited<ReturnType<typeof fetchEcosystemMetrics>>
        try {
          metrics = await fetchEcosystemMetrics(height)
        } catch (error) {
          logger.warn(`Metrics fetch at height ${height} failed:`, error instanceof Error ? error.message : error)
          return null
        }

        return {
          timestamp: new Date(blockInfo.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          height: blockInfo.height,
          participants: metrics.participants,
          activeTrustRegistries: metrics.active_trust_registries,
          activeSchemas: metrics.active_schemas,
          issued: metrics.issued,
          verified: metrics.verified,
        }
      })
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        data.push(result.value)
      } else {
        failureCount++
      }
    })

    if (i + batchSize < heights.length) {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (data.length === 0 && failureCount > 0) {
    throw new Error(`Failed to fetch historical ecosystem data: all ${failureCount} data points failed`)
  }

  if (failureCount > 0) {
    logger.warn(`Ecosystem historical data: ${failureCount}/${heights.length} data points failed`)
  }

  return data.sort((a, b) => a.height - b.height)
}
