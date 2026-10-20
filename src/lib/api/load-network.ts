import type { RawNetwork } from '@/domain/network-model'
import type { NetworkConfig } from '../env'
import { createIndexerClient } from './indexer'

export async function loadRawNetwork(cfg: NetworkConfig): Promise<{ raw: RawNetwork; blockHeight: number }> {
  const indexer = createIndexerClient(cfg)
  const [ecosystems, schemas, participants, corporations, dids, block] = await Promise.all([
    indexer.ecosystems(),
    indexer.schemas(),
    indexer.participants(),
    indexer.corporations(),
    indexer.dids(),
    indexer.blockHeight(),
  ])
  return {
    raw: {
      ecosystems: ecosystems.data,
      schemas: schemas.data,
      participants: participants.data,
      corporations: corporations.data,
      dids: dids.data.dids,
    },
    blockHeight: block.data.height,
  }
}
