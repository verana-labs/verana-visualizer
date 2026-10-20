import type { NetworkModel } from '@/domain/network-model'
import { cometsFor } from '@/features/activity-feed/activity'
import type { IndexerEvent } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'

export function launchHistoryComets(events: readonly IndexerEvent[], model: NetworkModel): void {
  const launches = events.flatMap((ev) => cometsFor(ev, model))
  if (launches.length > 0) useObservatory.getState().launchComets(launches)
}
