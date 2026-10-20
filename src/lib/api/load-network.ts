import { buildNetworkModel, type NetworkModel, type RawNetwork } from '@/domain/network-model'
import { layoutFor } from '@/layouts'
import { type Layout } from '@/layouts/types'
import type { NetworkConfig } from '../env'
import { createIndexerClient } from './indexer'
import type { Fetched, QueryInfo } from './query-info'

export type ListQueryKey = 'ecosystems' | 'schemas' | 'participants' | 'corporations' | 'dids'

export interface LoadSink {
  ecosystems?: RawNetwork['ecosystems']
  schemas?: RawNetwork['schemas']
  participants?: RawNetwork['participants']
  corporations?: RawNetwork['corporations']
  blockHeight?: number
  dids?: RawNetwork['dids']
  model?: NetworkModel
  layout?: Layout
  queries?: Partial<Record<ListQueryKey, QueryInfo>>
}

export interface LoadStep {
  label: string
  barrier?: boolean
  run: () => Promise<unknown>
}

export const LOADER_TIMEOUT_MS = 15_000

export function networkLoadSteps(cfg: NetworkConfig, sink: LoadSink): LoadStep[] {
  const indexer = createIndexerClient(cfg, undefined, { timeoutMs: LOADER_TIMEOUT_MS })
  const recorded = <T>(key: ListQueryKey, fetched: Fetched<T>): T => {
    sink.queries = { ...sink.queries, [key]: fetched.query }
    return fetched.data
  }
  return [
    {
      label: 'Reading ecosystems…',
      run: async () => {
        sink.ecosystems = recorded('ecosystems', await indexer.ecosystems())
      },
    },
    {
      label: 'Reading schemas…',
      run: async () => {
        sink.schemas = recorded('schemas', await indexer.schemas())
      },
    },
    {
      label: 'Reading participants…',
      run: async () => {
        sink.participants = recorded('participants', await indexer.participants())
      },
    },
    {
      label: 'Reading corporations…',
      run: async () => {
        sink.corporations = recorded('corporations', await indexer.corporations())
      },
    },
    {
      label: 'Reading block height…',
      run: async () => {
        sink.blockHeight = (await indexer.blockHeight()).data.height
      },
    },
    {
      label: 'Reading DIDs…',
      run: async () => {
        sink.dids = recorded('dids', await indexer.dids()).dids
      },
    },
    {
      label: 'Laying out the network…',
      barrier: true,
      run: async () => {
        sink.model = buildNetworkModel(rawFromSink(sink))
        sink.layout = layoutFor('network', sink.model)
      },
    },
  ]
}

export function rawFromSink(sink: LoadSink): RawNetwork {
  const { ecosystems, schemas, participants, corporations, dids } = sink
  if (!ecosystems || !schemas || !participants || !corporations || !dids) {
    throw new Error('Cannot assemble the network: a data step has not completed')
  }
  return { ecosystems, schemas, participants, corporations, dids }
}

export async function loadRawNetwork(cfg: NetworkConfig): Promise<{ raw: RawNetwork; blockHeight: number }> {
  const sink: LoadSink = {}
  for (const step of networkLoadSteps(cfg, sink).slice(0, 6)) await step.run()
  if (sink.blockHeight === undefined) throw new Error('Cannot assemble the network: block height missing')
  return { raw: rawFromSink(sink), blockHeight: sink.blockHeight }
}
