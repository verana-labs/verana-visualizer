'use client'

import { type ReactNode, useEffect } from 'react'
import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { participantState } from '@/domain/participant-state'
import type { ListQueryKey } from '@/lib/api/load-network'
import type { Ecosystem } from '@/lib/api/schemas'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import {
  accreditationsOf,
  ecosystemMembers,
  ecosystemOf,
  formatAmount,
  numericIdOf,
  rawCorporation,
  rawEcosystem,
  rawParticipant,
  rawSchema,
} from './entity-facts'
import { ExternalLink, Fact, Kicker, Mono, RoleChip, StateChip, VerdictChip } from './entity-parts'
import { ShowQuery } from './show-query'

interface PanelProps {
  model: NetworkModel
  entity: Entity
  frontendUrl: string
}

const select = (id: EntityId) => useObservatory.getState().select(id)

function Title({ children }: { children: ReactNode }) {
  return <h2 className="mt-1 mb-0.5 break-words text-lg font-semibold tracking-[-.01em]">{children}</h2>
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-3.5">
      <Kicker>{title}</Kicker>
      <div className="mt-1">{children}</div>
    </section>
  )
}

function EntityButton({ entity, note }: { entity: Entity; note?: string }) {
  return (
    <button
      type="button"
      onClick={() => select(entity.id)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-scene-line py-[7px] text-left text-[12.5px] last:border-b-0 hover:text-white"
    >
      <span className="truncate">{entity.name}</span>
      {note && (
        <b className="shrink-0 font-medium" style={{ color: entity.color }}>
          {note}
        </b>
      )}
    </button>
  )
}

function governanceUrl(eco: Ecosystem): string | undefined {
  const version = eco.versions.find((v) => v.version === eco.active_version) ?? eco.versions.at(-1)
  return version?.documents[0]?.url
}

function CompositionBar({ participants }: { participants: Entity[] }) {
  const counts = new Map<string, number>()
  for (const p of participants) counts.set(p.color, (counts.get(p.color) ?? 0) + 1)
  if (counts.size === 0) return null
  return (
    <div className="my-2.5 flex h-1.5 overflow-hidden rounded-full" aria-hidden="true">
      {[...counts].map(([color, count]) => (
        <span key={color} style={{ flex: count, background: color }} />
      ))}
    </div>
  )
}

function EcosystemPanel({ model, entity, frontendUrl }: PanelProps) {
  const eco = rawEcosystem(model, entity.id)
  if (!eco) return null
  const { participants, schemas } = ecosystemMembers(model, entity)
  const corporation = model.entities.get(`corporation:${eco.corporation_id}`)
  return (
    <>
      <Kicker>ecosystem · trust root</Kicker>
      <Title>{entity.name}</Title>
      <Mono>{eco.did}</Mono>
      <CompositionBar participants={participants} />
      <Fact label="Participants">{formatAmount(participants.length)}</Fact>
      <Fact label="Credential schemas">{formatAmount(schemas.length)}</Fact>
      <Fact label="Credentials issued">{formatAmount(eco.issued)}</Fact>
      <Fact label="Verifications">{formatAmount(eco.verified)}</Fact>
      <Fact label="Trust weight">{formatAmount(eco.weight)}</Fact>
      {corporation && (
        <Section title="operated by">
          <EntityButton entity={corporation} note={`#${eco.corporation_id}`} />
        </Section>
      )}
      {schemas.length > 0 && (
        <Section title="credential schemas">
          {schemas.map((schema) => (
            <a
              key={schema.id}
              href={`${frontendUrl}/credential-schemas/${numericIdOf(schema.id)}`}
              target="_blank"
              rel="noreferrer"
              className="flex justify-between gap-3 border-b border-scene-line py-[7px] text-[12.5px] last:border-b-0 hover:text-white"
            >
              <span className="truncate">{schema.name}</span>
              <b className="shrink-0 font-medium">#{numericIdOf(schema.id)} ↗</b>
            </a>
          ))}
        </Section>
      )}
      <div className="mt-3.5 flex flex-col gap-2">
        <ExternalLink href={`${frontendUrl}/ecosystems/${eco.id}`}>Open in Verana app ↗</ExternalLink>
        <ExternalLink href={governanceUrl(eco)}>Governance framework ↗</ExternalLink>
      </div>
    </>
  )
}

function ParticipantPanel({ model, entity, frontendUrl }: PanelProps) {
  const p = rawParticipant(model, entity.id)
  if (!p) return null
  const chain = model
    .chainToRoot(entity.id)
    .slice(1)
    .flatMap((id) => model.entities.get(id) ?? [])
  const schema = model.entities.get(`schema:${p.schema_id}`)
  return (
    <>
      <Kicker>participant · {ecosystemOf(model, entity)?.name ?? 'no ecosystem'}</Kicker>
      <Title>
        {entity.name} <span className="font-normal text-scene-mut">#{p.id}</span>
      </Title>
      <div className="my-2 flex flex-wrap gap-1.5">
        <RoleChip role={p.role} />
        <StateChip state={participantState(p, new Date())} />
        <span className="inline-block rounded-full bg-white/5 px-[9px] py-[3px] text-[11px] font-medium text-scene-mut">
          onboarding {p.op_state}
        </span>
      </div>
      <Mono>{p.did ?? 'no DID'}</Mono>
      <div className="mt-1.5">
        <Fact label="Schema">{schema?.name ?? `#${p.schema_id}`}</Fact>
        <Fact label="Issued / verified">
          {formatAmount(p.issued)} / {formatAmount(p.verified)}
        </Fact>
        <Fact label="Trust deposit">{formatAmount(p.deposit)}</Fact>
        <Fact label="Fees (validation · issue · verify)">
          {formatAmount(p.validation_fees)} · {formatAmount(p.issuance_fees)} · {formatAmount(p.verification_fees)}
        </Fact>
      </div>
      {chain.length > 0 && (
        <Section title="Accredited by">
          {chain.map((link) => (
            <EntityButton key={link.id} entity={link} note={link.kind === 'ecosystem' ? 'root' : 'validator'} />
          ))}
        </Section>
      )}
      <div className="mt-3.5">
        <ExternalLink href={`${frontendUrl}/participants/${p.id}`}>Open in Verana app ↗</ExternalLink>
      </div>
    </>
  )
}

function SchemaPanel({ model, entity, frontendUrl }: PanelProps) {
  const schema = rawSchema(model, entity.id)
  if (!schema) return null
  return (
    <>
      <Kicker>credential schema · {ecosystemOf(model, entity)?.name ?? 'no ecosystem'}</Kicker>
      <Title>{entity.name}</Title>
      <Fact label="Participants">{formatAmount(schema.participants)}</Fact>
      <Fact label="Credentials issued">{formatAmount(schema.issued)}</Fact>
      <Fact label="Verifications">{formatAmount(schema.verified)}</Fact>
      <Fact label="Issuer onboarding">{schema.issuer_onboarding_mode}</Fact>
      <Fact label="Verifier onboarding">{schema.verifier_onboarding_mode}</Fact>
      <div className="mt-3.5">
        <ExternalLink href={`${frontendUrl}/credential-schemas/${schema.id}`}>Open in Verana app ↗</ExternalLink>
      </div>
    </>
  )
}

function AgentPanel({ model, entity }: PanelProps) {
  const verdict = useObservatory((s) => s.agentVerdicts.get(entity.id))
  const accreditations = accreditationsOf(model, entity.id)
  const anchors = model.agentAnchors(entity.id).flatMap((id) => model.entities.get(id) ?? [])
  return (
    <>
      <Kicker>verifiable service · agent</Kicker>
      <Title>{entity.name}</Title>
      <div className="my-2">
        <VerdictChip verdict={verdict} />
      </div>
      <Mono>{entity.did}</Mono>
      <Section title={`operates ${accreditations.length} accreditation${accreditations.length === 1 ? '' : 's'}`}>
        {anchors.length === 0 && (
          <p className="py-[7px] text-[12.5px] text-scene-mut">No accreditation found on chain</p>
        )}
        {anchors.map((anchor) => (
          <EntityButton key={anchor.id} entity={anchor} note={ecosystemOf(model, anchor)?.name} />
        ))}
      </Section>
    </>
  )
}

function CorporationPanel({ model, entity }: PanelProps) {
  const corp = rawCorporation(model, entity.id)
  if (!corp) return null
  const ecosystems = model.ecosystems.filter((eco) => rawEcosystem(model, eco.id)?.corporation_id === corp.id)
  return (
    <>
      <Kicker>corporation #{corp.id}</Kicker>
      <Title>{entity.name}</Title>
      <Mono>{corp.did ?? 'no DID'}</Mono>
      <div className="mt-1.5">
        <Fact label="Controlled ecosystems">{formatAmount(corp.controlled_ecosystems)}</Fact>
        <Fact label="Participants">{formatAmount(corp.participants)}</Fact>
        <Fact label="Trust deposit">{formatAmount(corp.deposit)}</Fact>
        <Fact label="Slashes">{formatAmount(corp.slash_count)}</Fact>
      </div>
      {ecosystems.length > 0 && (
        <Section title="ecosystems">
          {ecosystems.map((eco) => (
            <EntityButton key={eco.id} entity={eco} />
          ))}
        </Section>
      )}
    </>
  )
}

function ProposalPanel({ entity }: PanelProps) {
  return (
    <>
      <Kicker>proposal</Kicker>
      <Title>{entity.name}</Title>
      <Mono>{entity.id}</Mono>
    </>
  )
}

const PANELS = {
  ecosystem: { Panel: EcosystemPanel, query: 'ecosystems' },
  participant: { Panel: ParticipantPanel, query: 'participants' },
  schema: { Panel: SchemaPanel, query: 'schemas' },
  agent: { Panel: AgentPanel, query: 'dids' },
  corporation: { Panel: CorporationPanel, query: 'corporations' },
  proposal: { Panel: ProposalPanel, query: null },
} as const satisfies Record<Entity['kind'], { Panel: (props: PanelProps) => ReactNode; query: ListQueryKey | null }>

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export function Inspector({ frontendUrl }: { frontendUrl: string }) {
  const selected = useObservatory((s) => s.selected)
  const model = useObservatory((s) => s.model)
  const queries = useObservatory((s) => s.queries)
  const entity = selected && model ? model.entities.get(selected) : undefined

  useEffect(() => {
    if (!selected) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isTyping(event.target)) return
      useObservatory.getState().select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  if (!entity || !model) return null
  const { Panel, query: queryKey } = PANELS[entity.kind]
  const query = queryKey ? queries[queryKey] : undefined

  return (
    <GlassPanel
      data-testid="inspector"
      role="dialog"
      aria-label={`${entity.name} details`}
      className="fixed top-4 right-4 z-20 max-h-[calc(100vh-150px)] w-[340px] max-w-[calc(100vw-32px)] overflow-y-auto p-[18px] text-scene-txt"
    >
      <button
        type="button"
        aria-label="Close inspector"
        onClick={() => useObservatory.getState().select(null)}
        className="absolute top-3 right-3.5 cursor-pointer text-lg leading-none text-scene-mut hover:text-white"
      >
        ×
      </button>
      <div key={entity.id}>
        <Panel model={model} entity={entity} frontendUrl={frontendUrl} />
      </div>
      {query && <ShowQuery query={query} />}
    </GlassPanel>
  )
}
