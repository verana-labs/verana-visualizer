import type { VotesState } from '@/domain/governance'
import type { EntityId } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'

export function setProposalVotes(id: EntityId, votes: VotesState) {
  const { governance, setGovernance } = useObservatory.getState()
  if (governance) setGovernance({ ...governance, votes: new Map(governance.votes).set(id, votes) })
}
