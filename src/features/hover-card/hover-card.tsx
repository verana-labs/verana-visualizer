'use client'

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { Entity, NetworkModel } from '@/domain/network-model'
import { participantState } from '@/domain/participant-state'
import {
  accreditationsOf,
  ecosystemMembers,
  ecosystemOf,
  formatAmount,
  rawEcosystem,
  rawParticipant,
} from '@/features/inspector/entity-facts'
import { Fact, Kicker, RoleChip, StateChip, VerdictChip } from '@/features/inspector/entity-parts'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'

const OFFSET_X = 16
const OFFSET_Y = 14
const EDGE = 12

interface Size {
  width: number
  height: number
}

export function clampToViewport(pointer: { x: number; y: number }, card: Size, viewport: Size) {
  const clamp = (value: number, max: number) => Math.max(EDGE, Math.min(value, max))
  return {
    left: clamp(pointer.x + OFFSET_X, viewport.width - card.width - EDGE),
    top: clamp(pointer.y + OFFSET_Y, viewport.height - card.height - EDGE),
  }
}

function Title({ children }: { children: string }) {
  return <div className="mt-0.5 mb-1.5 text-[13.5px] font-semibold">{children}</div>
}

function Hint({ children }: { children: string }) {
  return <div className="mt-1.5 text-[10.5px] text-scene-mut">{children}</div>
}

function EcosystemCard({ model, entity }: { model: NetworkModel; entity: Entity }) {
  const { participants, schemas } = ecosystemMembers(model, entity)
  const issued = rawEcosystem(model, entity.id)?.issued
  return (
    <>
      <Kicker>ecosystem · trust root</Kicker>
      <Title>{`★ ${entity.name}`}</Title>
      <Fact label="Participants">{formatAmount(participants.length)}</Fact>
      <Fact label="Credential schemas">{formatAmount(schemas.length)}</Fact>
      {issued !== undefined && <Fact label="Credentials issued">{formatAmount(issued)}</Fact>}
      <Hint>Click to fly in</Hint>
    </>
  )
}

function ParticipantCard({ model, entity }: { model: NetworkModel; entity: Entity }) {
  const p = rawParticipant(model, entity.id)
  const parentId = model.parentOf(entity.id)
  const parent = parentId ? model.entities.get(parentId) : undefined
  return (
    <>
      <Kicker>{ecosystemOf(model, entity)?.name ?? 'participant'}</Kicker>
      <Title>{entity.name}</Title>
      {p && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          <RoleChip role={p.role} />
          <StateChip state={participantState(p, new Date())} />
        </div>
      )}
      <Fact label="Accredited by">{parent?.name ?? '–'}</Fact>
      {p && (
        <Fact label="Issued / verified">
          {formatAmount(p.issued)} / {formatAmount(p.verified)}
        </Fact>
      )}
      <Hint>Click to inspect its trust chain</Hint>
    </>
  )
}

function AgentCard({ model, entity }: { model: NetworkModel; entity: Entity }) {
  const verdict = useObservatory((s) => s.agentVerdicts.get(entity.id))
  return (
    <>
      <Kicker>verifiable service</Kicker>
      <Title>{`◆ ${entity.name}`}</Title>
      <VerdictChip verdict={verdict} />
      <div className="mt-1.5">
        <Fact label="Accreditations held">{formatAmount(accreditationsOf(model, entity.id).length)}</Fact>
      </div>
      <Hint>Click to inspect its DID</Hint>
    </>
  )
}

function CardBody({ model, entity }: { model: NetworkModel; entity: Entity }) {
  if (entity.kind === 'ecosystem') return <EcosystemCard model={model} entity={entity} />
  if (entity.kind === 'participant') return <ParticipantCard model={model} entity={entity} />
  if (entity.kind === 'agent') return <AgentCard model={model} entity={entity} />
  return (
    <>
      <Kicker>{entity.kind}</Kicker>
      <Title>{entity.name}</Title>
    </>
  )
}

export function HoverCard() {
  const hovered = useObservatory((s) => s.hovered)
  const model = useObservatory((s) => s.model)
  const card = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const entity = hovered && hovered !== 'rocket' && model ? model.entities.get(hovered) : undefined

  const place = useCallback(() => {
    const el = card.current
    if (!el) return
    const { left, top } = clampToViewport(
      pointer.current,
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight }
    )
    el.style.transform = `translate3d(${left}px, ${top}px, 0)`
  }, [])

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY }
      place()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [place])

  useLayoutEffect(() => {
    if (entity) place()
  }, [entity, place])

  if (!entity || !model) return null
  return (
    <GlassPanel
      ref={card}
      data-testid="hover-card"
      className="pointer-events-none fixed top-0 left-0 z-30 w-[240px] px-3.5 py-3 text-[12px] text-scene-txt"
    >
      <CardBody model={model} entity={entity} />
    </GlassPanel>
  )
}
