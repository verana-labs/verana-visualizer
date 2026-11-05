import type { EntityKind } from '@/domain/network-model'

export interface SpecLink {
  label: string
  href: string
}

const VPR_SPEC = 'https://verana-labs.github.io/verifiable-trust-vpr-spec/versions/v4/'
const VT_SPEC = 'https://verana-labs.github.io/verifiable-trust-spec/versions/v4/'
const COMPONENT_SPECS = 'https://github.com/verana-labs/verana-spec/blob/main/v4'

const vpr = (anchor: string): SpecLink => ({ label: 'VPR spec', href: `${VPR_SPEC}#${anchor}` })

export const ENTITY_SPECS: Record<EntityKind, SpecLink> = {
  ecosystem: vpr('ecosystem'),
  participant: vpr('participant'),
  schema: vpr('credentialschema'),
  corporation: vpr('corporation'),
  proposal: vpr('governance-of-a-vpr'),
  agent: { label: 'Verifiable Trust spec', href: `${VT_SPEC}#what-is-a-verifiable-service-vs` },
}

export const GROUP_PROPOSAL_SPEC = vpr('corporation-management')

const INDEXER_SPEC: SpecLink = { label: 'indexer spec', href: `${COMPONENT_SPECS}/verana-indexer/spec.md` }
const GRAPH_SPEC: SpecLink = { label: 'graph spec', href: `${COMPONENT_SPECS}/verana-graph/spec.md` }

export function apiSpecOf(url: string): SpecLink | null {
  const { pathname } = new URL(url)
  if (pathname.startsWith('/v4/graph/')) return GRAPH_SPEC
  return pathname.startsWith('/v4/') ? INDEXER_SPEC : null
}
