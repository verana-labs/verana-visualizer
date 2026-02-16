import { EcosystemMetrics, EcosystemMetricsDataPoint } from '@/types'
import { getCurrentBlockHeight, getBlockAtHeight, calculateHistoricalHeights } from './historicalDataFetcher'

const IDX_ENDPOINT = process.env.NEXT_PUBLIC_IDX_ENDPOINT || 'https://idx.testnet.verana.network'

async function getMetricsAtHeight(height: number): Promise<EcosystemMetrics | null> {
  try {
    const response = await fetch(`${IDX_ENDPOINT}/verana/metrics/v1/all`, {
      headers: { 'At-Block-Height': height.toString() }
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`Error fetching metrics at height ${height}:`, error)
    return null
  }
}

export async function fetchHistoricalEcosystemData(
  dataPoints: number = 30
): Promise<EcosystemMetricsDataPoint[]> {
  const currentHeight = await getCurrentBlockHeight()
  const heights = calculateHistoricalHeights(currentHeight, dataPoints)

  const data: EcosystemMetricsDataPoint[] = []
  const batchSize = 5

  for (let i = 0; i < heights.length; i += batchSize) {
    const batch = heights.slice(i, i + batchSize)

    const results = await Promise.allSettled(
      batch.map(async (height) => {
        const [blockInfo, metrics] = await Promise.all([
          getBlockAtHeight(height),
          getMetricsAtHeight(height)
        ])

        if (!metrics) return null

        return {
          timestamp: new Date(blockInfo.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          height: blockInfo.height,
          participants: metrics.participants,
          activeTrustRegistries: metrics.active_trust_registries,
          activeSchemas: metrics.active_schemas,
          issued: metrics.issued,
          verified: metrics.verified
        }
      })
    )

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        data.push(result.value)
      }
    })

    if (i + batchSize < heights.length) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  return data.sort((a, b) => a.height - b.height)
}
