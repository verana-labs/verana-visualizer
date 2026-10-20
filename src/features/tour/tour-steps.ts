import type { EntityId, NetworkModel } from '@/domain/network-model'
import type { LensId } from '@/layouts/types'

export type TourStepId = 'intro' | LensId | 'trust-check' | 'live-core'

export interface TourStep {
  id: TourStepId
  lens: LensId
  caption: string
  select: EntityId | null
  did: string | null
}

function busiestEcosystem(model: NetworkModel) {
  return [...model.raw.ecosystems]
    .filter((e) => model.entities.has(`ecosystem:${e.id}`))
    .sort((a, b) => b.participants - a.participants)[0]
}

function checkedService(model: NetworkModel) {
  const agent = [...model.agents]
    .filter((a) => a.did)
    .sort((a, b) => model.agentAnchors(b.id).length - model.agentAnchors(a.id).length)[0]
  return agent ?? model.participants.find((p) => p.did)
}

export function tourSteps(model: NetworkModel, chainName: string): TourStep[] {
  const busiest = busiestEcosystem(model)
  const star = busiest ? model.entities.get(`ecosystem:${busiest.id}`) : undefined
  const corporation = busiest ? model.entities.get(`corporation:${busiest.corporation_id}`) : undefined
  const service = checkedService(model)
  const step = (id: TourStepId, lens: LensId, caption: string, select: EntityId | null = null): TourStep => ({
    id,
    lens,
    caption,
    select,
    did: null,
  })

  return [
    step(
      'intro',
      'network',
      `This is the Verana ${chainName}, live. Each glowing star is an ecosystem: an organization that decides which credentials matter and who is allowed to issue them.`
    ),
    step(
      'network',
      'network',
      `Around each star orbit its participants. Every tilted orbit is one kind of credential, and the further out, the further down the chain of accreditation.${star ? ` Here is ${star.name}.` : ''}`,
      star?.id ?? null
    ),
    step(
      'trust',
      'trust',
      'Unfold it and you see the chain of accreditation: the ecosystem accredits grantors, grantors accredit issuers and verifiers, and issuers serve holders.',
      star?.id ?? null
    ),
    step(
      'economics',
      'economics',
      'Taking part costs real stake. Organizations lock a trust deposit, shown here as glowing reservoirs, and every fee rule is public. Misbehave and the deposit can be slashed.'
    ),
    step(
      'chain',
      'chain',
      'Underneath runs the Verana blockchain. These validators keep it honest, each sized by its voting power, while new blocks rise from the core.'
    ),
    step(
      'time',
      'time',
      'Nothing is lost. The Time lens replays the network from its first block to now, so every bit of growth can be checked, not just claimed.'
    ),
    step(
      'governance',
      'governance',
      `The organizations behind the ecosystems govern on chain: each constellation is a corporation and its members, with the proposals they vote on.${corporation ? ` Here is ${corporation.name}.` : ''}`,
      corporation?.id ?? null
    ),
    step(
      'registry',
      'registry',
      'The registry keeps the books: who is onboarding, who is active, which accreditations expire soon, and how much of each ecosystem is covered.'
    ),
    {
      ...step(
        'trust-check',
        'network',
        `Anyone can check a service.${service ? ` Here the network traces ${service.name} hop by hop back to its ecosystem root,` : ' The network traces it hop by hop back to its ecosystem root,'} then gives its verdict: cyan means trusted, rose means the network says no.`
      ),
      did: service?.did ?? null,
    },
    step(
      'live-core',
      'network',
      'A new block lands about every 6 seconds at the chain core below. Each real transaction flies as a comet to the entities it touched. Nothing on this screen is simulated.'
    ),
  ]
}
