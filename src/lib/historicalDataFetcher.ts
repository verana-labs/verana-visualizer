/**
 * Historical Data Fetcher
 * Fetches historical blockchain data by querying state at different block heights.
 * Uses the Verana network REST API with height parameters to build time-series data.
 */

const API_ENDPOINT = process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://api.testnet.verana.network'
const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://rpc.testnet.verana.network'

interface BlockInfo {
  height: number
  timestamp: string
}

/**
 * Get current block height
 */
export async function getCurrentBlockHeight(): Promise<number> {
  try {
    const response = await fetch(`${RPC_ENDPOINT}/block`)
    const data = await response.json()
    return parseInt(data.result?.block?.header?.height || '0')
  } catch (error) {
    console.error('Error fetching current block height:', error)
    throw error
  }
}

/**
 * Get block info at specific height
 */
export async function getBlockAtHeight(height: number): Promise<BlockInfo> {
  try {
    const response = await fetch(`${RPC_ENDPOINT}/block?height=${height}`)
    const data = await response.json()
    return {
      height: parseInt(data.result?.block?.header?.height || '0'),
      timestamp: data.result?.block?.header?.time || new Date().toISOString()
    }
  } catch (error) {
    console.error(`Error fetching block at height ${height}:`, error)
    throw error
  }
}

/**
 * Get supply at specific height
 */
export async function getSupplyAtHeight(height: number) {
  try {
    const response = await fetch(`${API_ENDPOINT}/cosmos/bank/v1beta1/supply?height=${height}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching supply at height ${height}:`, error)
    return null
  }
}

/**
 * Get staking pool at specific height
 */
export async function getStakingPoolAtHeight(height: number) {
  try {
    const response = await fetch(`${API_ENDPOINT}/cosmos/staking/v1beta1/pool?height=${height}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching staking pool at height ${height}:`, error)
    return null
  }
}

/**
 * Get inflation at specific height
 */
export async function getInflationAtHeight(height: number) {
  try {
    const response = await fetch(`${API_ENDPOINT}/cosmos/mint/v1beta1/inflation?height=${height}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching inflation at height ${height}:`, error)
    return null
  }
}

/**
 * Get validators at specific height
 */
export async function getValidatorsAtHeight(height: number) {
  try {
    const response = await fetch(`${API_ENDPOINT}/cosmos/staking/v1beta1/validators?height=${height}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error(`Error fetching validators at height ${height}:`, error)
    return null
  }
}

/**
 * Calculate historical block heights for sampling
 * @param currentHeight Current block height
 * @param dataPoints Number of historical points to fetch
 * @param blocksPerDay Estimated blocks per day (default ~17280 for 5s block time)
 */
export function calculateHistoricalHeights(
  currentHeight: number, 
  dataPoints: number = 30,
  blocksPerDay: number = 17280
): number[] {
  const heights: number[] = []
  const blocksPerPoint = Math.floor(blocksPerDay / (dataPoints / 30)) // Distribute over 30 days
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    const height = currentHeight - (i * blocksPerPoint)
    if (height > 0) {
      heights.push(height)
    }
  }
  
  return heights
}

interface SupplyDataPoint {
  timestamp: string
  height: number
  supply: number
  bonded: number
  unbonded: number
}

/**
 * Fetch historical token supply data
 */
export async function fetchHistoricalSupplyData(dataPoints: number = 30): Promise<SupplyDataPoint[]> {
  try {
    const currentHeight = await getCurrentBlockHeight()
    const heights = calculateHistoricalHeights(currentHeight, dataPoints)
    
    const data: SupplyDataPoint[] = []
    
    // Fetch data for each height (with some parallelization to speed up)
    const batchSize = 5 // Fetch 5 at a time to avoid overwhelming the API
    for (let i = 0; i < heights.length; i += batchSize) {
      const batch = heights.slice(i, i + batchSize)
      
      const results = await Promise.allSettled(
        batch.map(async (height) => {
          const [blockInfo, supplyData, stakingData] = await Promise.all([
            getBlockAtHeight(height),
            getSupplyAtHeight(height),
            getStakingPoolAtHeight(height)
          ])
          
          if (!supplyData || !stakingData) return null
          
          const totalSupply = parseInt(supplyData.supply?.[0]?.amount || '0')
          const bonded = parseInt(stakingData.pool?.bonded_tokens || '0')
          const unbonded = parseInt(stakingData.pool?.not_bonded_tokens || '0')
          
          return {
            timestamp: new Date(blockInfo.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            height: blockInfo.height,
            supply: totalSupply,
            bonded: bonded,
            unbonded: totalSupply - bonded
          }
        })
      )
      
      // Filter out failed requests and add successful ones
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          data.push(result.value)
        }
      })
      
      // Small delay between batches to be nice to the API
      if (i + batchSize < heights.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    return data.sort((a, b) => a.height - b.height)
  } catch (error) {
    console.error('Error fetching historical supply data:', error)
    throw error
  }
}

interface InflationDataPoint {
  timestamp: string
  height: number
  inflationRate: number
  annualProvisions: number
}

/**
 * Fetch historical inflation data
 */
export async function fetchHistoricalInflationData(dataPoints: number = 30): Promise<InflationDataPoint[]> {
  try {
    const currentHeight = await getCurrentBlockHeight()
    const heights = calculateHistoricalHeights(currentHeight, dataPoints)
    
    const data: InflationDataPoint[] = []
    const batchSize = 5
    
    for (let i = 0; i < heights.length; i += batchSize) {
      const batch = heights.slice(i, i + batchSize)
      
      const results = await Promise.allSettled(
        batch.map(async (height) => {
          const [blockInfo, inflationData] = await Promise.all([
            getBlockAtHeight(height),
            getInflationAtHeight(height)
          ])
          
          if (!inflationData) return null
          
          const inflationRate = parseFloat(inflationData.inflation || '0')
          // Estimate annual provisions (blocks_per_year * inflation * current_supply)
          const annualProvisions = 6311520 * inflationRate * 1000000000 // Rough estimate
          
          return {
            timestamp: new Date(blockInfo.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            height: blockInfo.height,
            inflationRate: inflationRate,
            annualProvisions: Math.round(annualProvisions)
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
  } catch (error) {
    console.error('Error fetching historical inflation data:', error)
    throw error
  }
}

interface NetworkActivityDataPoint {
  timestamp: string
  height: number
  transactions: number
  blockTime: number
  gasUsed: number
}

/**
 * Fetch network activity data from recent blocks
 */
export async function fetchHistoricalNetworkActivity(dataPoints: number = 30): Promise<NetworkActivityDataPoint[]> {
  try {
    const currentHeight = await getCurrentBlockHeight()
    const heights = calculateHistoricalHeights(currentHeight, dataPoints)
    
    const data: NetworkActivityDataPoint[] = []
    const batchSize = 5
    
    for (let i = 0; i < heights.length; i += batchSize) {
      const batch = heights.slice(i, i + batchSize)
      
      const results = await Promise.allSettled(
        batch.map(async (height) => {
          try {
            const blockResponse = await fetch(`${RPC_ENDPOINT}/block?height=${height}`)
            const blockData = await blockResponse.json()
            
            const block = blockData.result?.block
            if (!block) return null
            
            const txCount = block.data?.txs?.length || 0
            const timestamp = block.header?.time
            
            // Get previous block to calculate block time
            let blockTime = 5.5 // Default estimate
            if (height > 1) {
              try {
                const prevBlockResponse = await fetch(`${RPC_ENDPOINT}/block?height=${height - 1}`)
                const prevBlockData = await prevBlockResponse.json()
                const prevTime = new Date(prevBlockData.result?.block?.header?.time)
                const currTime = new Date(timestamp)
                blockTime = (currTime.getTime() - prevTime.getTime()) / 1000
              } catch (e) {
                // Use default if we can't get previous block
              }
            }
            
            return {
              timestamp: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              height: height,
              transactions: txCount,
              blockTime: parseFloat(blockTime.toFixed(2)),
              gasUsed: txCount * 200000 // Rough estimate, actual gas would need tx details
            }
          } catch (error) {
            return null
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
  } catch (error) {
    console.error('Error fetching historical network activity:', error)
    throw error
  }
}

interface ValidatorDataPoint {
  name: string
  votingPower: number
  commission: number
}

/**
 * Fetch current validator distribution
 */
export async function fetchCurrentValidatorDistribution(): Promise<ValidatorDataPoint[]> {
  try {
    const response = await fetch(`${API_ENDPOINT}/cosmos/staking/v1beta1/validators`)
    if (!response.ok) throw new Error('Failed to fetch validators')
    
    const data = await response.json()
    const validators = data.validators || []
    
    return validators
      .filter((v: any) => v.status === 'BOND_STATUS_BONDED')
      .map((v: any) => ({
        name: v.description?.moniker || 'Unknown',
        votingPower: parseInt(v.tokens || '0'),
        commission: parseFloat(v.commission?.commission_rates?.rate || '0')
      }))
      .sort((a: any, b: any) => b.votingPower - a.votingPower)
      .slice(0, 10)
  } catch (error) {
    console.error('Error fetching validator distribution:', error)
    throw error
  }
}

interface StakingDataPoint {
  name: string
  value: number
}

/**
 * Fetch current staking distribution
 */
export async function fetchCurrentStakingDistribution(): Promise<StakingDataPoint[]> {
  try {
    const [supplyResponse, poolResponse] = await Promise.all([
      fetch(`${API_ENDPOINT}/cosmos/bank/v1beta1/supply`),
      fetch(`${API_ENDPOINT}/cosmos/staking/v1beta1/pool`)
    ])
    
    if (!supplyResponse.ok || !poolResponse.ok) {
      throw new Error('Failed to fetch staking data')
    }
    
    const supplyData = await supplyResponse.json()
    const poolData = await poolResponse.json()
    
    const totalSupply = parseInt(supplyData.supply?.[0]?.amount || '0')
    const bonded = parseInt(poolData.pool?.bonded_tokens || '0')
    const notBonded = parseInt(poolData.pool?.not_bonded_tokens || '0')
    const unbonding = Math.max(0, totalSupply - bonded - notBonded) // Tokens in unbonding
    
    return [
      {
        name: 'Bonded',
        value: bonded
      },
      {
        name: 'Unbonding',
        value: unbonding
      },
      {
        name: 'Not Bonded',
        value: notBonded
      }
    ]
  } catch (error) {
    console.error('Error fetching staking distribution:', error)
    throw error
  }
}

