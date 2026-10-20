'use client'

import { type ReactNode, useEffect } from 'react'
import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { participantState } from '@/domain/participant-state'
import { priced, vnaFromUvna } from '@/features/economics-sim/format'
import { ProposalPanel } from '@/features/governance/proposal-panel'
import { EcsBadge } from '@/features/registry/ecs-badge'
import { AbsentAtBlock, LiveTag } from '@/features/time-scrubber/live-tag'
import { TrustResult } from '@/features/trust-check/trust-result'
import type { ListQueryKey } from '@/lib/api/load-network'
import type { Ecosystem } from '@/lib/api/schemas'
import { isTyping } from '@/lib/is-typing'
import { useObservatory } from '@/store/observatory-store'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'
import {
  accreditationsOf,
  countedParticipants,
  ecosystemMembers,
  ecosystemOf,
  formatAmount,
  numericIdOf,
  rawCorporation,
  rawEcosystem,
  rawParticipant,
  rawSchema,
  schemaParticipants,
} from './entity-facts'
import { ExternalLink, Fact, Kicker, Mono, RoleChip, StateChip, VerdictChip } from './entity-parts'
import { ShowQuery } from './show-query'

interface PanelProps {
  model: NetworkModel
  entity: Entity
  frontendUrl: string
  chainId: string
}

function NotFound({ id, chainId }: { id: string; chainId: string }) {
  return (
    <>
      <Kicker>{id}</Kicker>
      <Title>{`Not found on ${chainId}`}</Title>
      <p className="text-[12.5px] text-scene-mut">The loaded data has no record for this entity.</p>
    </>
  )
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

function EcosystemPanel({ model, entity, frontendUrl, chainId }: PanelProps) {
  const eco = rawEcosystem(model, entity.id)
  if (!eco) return <NotFound id={entity.id} chainId={chainId} />
  const { participants, schemas } = ecosystemMembers(model, entity)
  const corporation = model.entities.get(`corporation:${eco.corporation_id}`)
  return (
    <>
      <Kicker>ecosystem · trust root</Kicker>
      <Title>{entity.name}</Title>
      <Mono>{eco.did}</Mono>
      <EcsBadge model={model} ecosystemId={eco.id} />
      <CompositionBar participants={participants} />
      <Fact label="Participants">{formatAmount(countedParticipants(model, participants))}</Fact>
      <Fact label="Credential schemas">{formatAmount(schemas.length)}</Fact>
      <Fact label="Credentials issued">{formatAmount(eco.issued)}</Fact>
      <Fact label="Verifications">{formatAmount(eco.verified)}</Fact>
      <Fact label="Trust weight">{vnaFromUvna(Number(eco.weight))}</Fact>
      {corporation && (
        <Section title="operated by">
          <EntityButton entity={corporation} note={`#${eco.corporation_id}`} />
        </Section>
      )}
      {schemas.length > 0 && (
        <Section title="credential schemas">
          {schemas.map((schema) => (
            <ExternalLink
              key={schema.id}
              variant="row"
              href={`${frontendUrl}/credential-schemas/${numericIdOf(schema.id)}`}
            >
              <span className="truncate">{schema.name}</span>
              <b className="shrink-0 font-medium">#{numericIdOf(schema.id)} ↗</b>
            </ExternalLink>
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

function ParticipantPanel({ model, entity, frontendUrl, chainId }: PanelProps) {
  const p = rawParticipant(model, entity.id)
  if (!p) return <NotFound id={entity.id} chainId={chainId} />
  const chain = model
    .chainToRoot(entity.id)
    .slice(1)
    .flatMap((id) => model.entities.get(id) ?? [])
  const schema = model.entities.get(`schema:${p.schema_id}`)
  const pricing = rawSchema(model, `schema:${p.schema_id}`)
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
        <Fact label="Trust deposit">{vnaFromUvna(Number(p.deposit))}</Fact>
        <Fact label="Fees (validation · issue · verify)">
          {[p.validation_fees, p.issuance_fees, p.verification_fees].map((fee) => priced(fee, pricing)).join(' · ')}
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

function SchemaPanel({ model, entity, frontendUrl, chainId }: PanelProps) {
  const schema = rawSchema(model, entity.id)
  if (!schema) return <NotFound id={entity.id} chainId={chainId} />
  return (
    <>
      <Kicker>credential schema · {ecosystemOf(model, entity)?.name ?? 'no ecosystem'}</Kicker>
      <Title>{entity.name}</Title>
      <Fact label="Participants">{formatAmount(countedParticipants(model, schemaParticipants(model, schema.id)))}</Fact>
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
  const did = entity.did
  return (
    <>
      <Kicker>verifiable service · agent</Kicker>
      <Title>{entity.name}</Title>
      <div className="my-2 flex items-center justify-between gap-2">
        <VerdictChip verdict={verdict} />
        {did && <Button onClick={() => useObservatory.getState().requestTrustCheck(did)}>Check trust</Button>}
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

function CorporationPanel({ model, entity, chainId }: PanelProps) {
  const corp = rawCorporation(model, entity.id)
  if (!corp) return <NotFound id={entity.id} chainId={chainId} />
  const ecosystems = model.ecosystems.filter((eco) => rawEcosystem(model, eco.id)?.corporation_id === corp.id)
  return (
    <>
      <Kicker>corporation #{corp.id}</Kicker>
      <Title>{entity.name}</Title>
      <Mono>{corp.did ?? 'no DID'}</Mono>
      <div className="mt-1.5">
        <Fact label="Controlled ecosystems">{formatAmount(corp.controlled_ecosystems)}</Fact>
        <Fact label="Participants">{formatAmount(corp.participants)}</Fact>
        <Fact label="Trust deposit">{vnaFromUvna(Number(corp.deposit))}</Fact>
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

const PANELS = {
  ecosystem: { Panel: EcosystemPanel, query: 'ecosystems' },
  participant: { Panel: ParticipantPanel, query: 'participants' },
  schema: { Panel: SchemaPanel, query: 'schemas' },
  agent: { Panel: AgentPanel, query: 'dids' },
  corporation: { Panel: CorporationPanel, query: 'corporations' },
  proposal: { Panel: ProposalPanel, query: null },
} as const satisfies Record<Entity['kind'], { Panel: (props: PanelProps) => ReactNode; query: ListQueryKey | null }>

const PANEL_CLASS =
  'fixed top-4 right-4 z-20 max-h-[calc(100vh-150px)] w-[340px] max-w-[calc(100vw-32px)] overflow-y-auto p-[18px] text-scene-txt'

function CloseButton({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className="absolute top-3 right-3.5 cursor-pointer text-lg leading-none text-scene-mut hover:text-white"
    >
      ×
    </button>
  )
}

export function Inspector({ frontendUrl, chainId }: { frontendUrl: string; chainId: string }) {
  const selected = useObservatory((s) => s.selected)
  const model = useObservatory((s) => s.model)
  const queries = useObservatory((s) => s.queries)
  const checking = useObservatory((s) => s.trustCheck !== null)
  const entity = selected && model ? model.entities.get(selected) : undefined

  useEffect(() => {
    if (!selected && !checking) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isTyping(event.target)) return
      const state = useObservatory.getState()
      if (state.trustCheck) state.clearTrustCheck()
      else state.select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, checking])

  if (checking)
    return (
      <GlassPanel data-testid="inspector" role="dialog" aria-label="Trust check" className={PANEL_CLASS}>
        <CloseButton label="Close trust check" onClose={() => useObservatory.getState().clearTrustCheck()} />
        <TrustResult />
      </GlassPanel>
    )

  if (!selected || !model) return null
  const panel = entity ? PANELS[entity.kind] : null
  const query = panel?.query ? queries[panel.query] : undefined

  return (
    <GlassPanel
      data-testid="inspector"
      role="dialog"
      aria-label={`${entity?.name ?? selected} details`}
      className={PANEL_CLASS}
    >
      <CloseButton label="Close inspector" onClose={() => useObservatory.getState().select(null)} />
      <LiveTag />
      <AbsentAtBlock id={selected} />
      <div key={selected}>
        {entity && panel ? (
          <panel.Panel model={model} entity={entity} frontendUrl={frontendUrl} chainId={chainId} />
        ) : (
          <NotFound id={selected} chainId={chainId} />
        )}
      </div>
      {query && <ShowQuery query={query} />}
    </GlassPanel>
  )
}
