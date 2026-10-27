'use client'

import { useFrame } from '@react-three/fiber'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  type Group,
  type InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  type Sprite,
  Vector3,
} from 'three'
import { type GovernanceProposal, proposalColor } from '@/domain/governance'
import type { EntityId } from '@/domain/network-model'
import { glowTexture } from '@/scene/glow-texture'
import { dimOf, type FocusSets, flashOf } from '@/scene/scene-focus'
import { lensVisibility, type PositionOf, tweenProgress } from '@/scene/use-lens-tween'
import { usePicking } from '@/scene/use-picking'
import { usePrefersReducedMotion } from '@/scene/use-reduced-motion'
import { useObservatory } from '@/store/observatory-store'
import { type MemberMark, memberMarks, proposalPulse } from './governance-scene'

const CORPORATION_COLOR = '#e2e8f0'
const MEMBER_COLOR = '#a78bfa'
const CORPORATION_SCALE = 2.6
const MEMBER_SCALE = 2.4
const PROPOSAL_SCALE = 1.5
const HIT_RADIUS = 0.7
const DIMMED = 0.2

interface MarksProps {
  positionOf: PositionOf
  focus: RefObject<FocusSets>
}

interface CorporationMarks {
  corporation: EntityId
  members: MemberMark[]
}

function visibilityAt(now: number, reduced: boolean): number {
  const { lens, lensFrom, lensChangedAt } = useObservatory.getState()
  return lensVisibility('governance', lens, lensFrom, tweenProgress(now, lensChangedAt, 0, reduced))
}

function dimFactor(focus: RefObject<FocusSets>, id: EntityId): number {
  return dimOf(focus.current, id) < DIMMED ? 0.25 : 1
}

function ProposalHits({ proposals, positionOf }: { proposals: GovernanceProposal[]; positionOf: PositionOf }) {
  const mesh = useRef<InstancedMesh>(null)
  const ids = useMemo(() => proposals.map((p) => p.id), [proposals])
  const picking = usePicking(ids)
  const geometry = useMemo(() => new SphereGeometry(HIT_RADIUS, 8, 8), [])
  const material = useMemo(() => new MeshBasicMaterial({ colorWrite: false, depthWrite: false }), [])
  const scratch = useMemo(() => ({ m: new Matrix4(), p: new Vector3(), q: new Quaternion(), s: new Vector3() }), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )
  useFrame(() => {
    const instances = mesh.current
    if (!instances) return
    const hittable = useObservatory.getState().lens === 'governance'
    const { m, p, q, s } = scratch
    s.setScalar(hittable ? 1 : 0)
    for (let i = 0; i < ids.length; i++) {
      const at = positionOf(ids[i])
      p.set(at[0], at[1], at[2])
      m.compose(p, q, s)
      instances.setMatrixAt(i, m)
    }
    instances.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh
      key={ids.length}
      ref={mesh}
      args={[geometry, material, Math.max(1, ids.length)]}
      count={ids.length}
      frustumCulled={false}
      {...picking}
    />
  )
}

export function GovernanceMarks({ positionOf, focus }: MarksProps) {
  const governance = useObservatory((s) => s.governance)
  const model = useObservatory((s) => s.model)
  const reduced = usePrefersReducedMotion()
  const texture = glowTexture()
  const root = useRef<Group>(null)
  const corporationSprites = useRef<(Sprite | null)[]>([])
  const memberSprites = useRef<(Sprite | null)[]>([])
  const proposalSprites = useRef<(Sprite | null)[]>([])

  const constellations = useMemo<CorporationMarks[]>(
    () =>
      (governance?.constellations ?? [])
        .filter((c) => model?.entities.has(c.corporation))
        .map((c) => ({ corporation: c.corporation, members: memberMarks(c) })),
    [governance, model]
  )
  const members = useMemo(
    () => constellations.flatMap((c) => c.members.map((mark) => ({ ...mark, corporation: c.corporation }))),
    [constellations]
  )
  const proposals = useMemo(
    () => [...(governance?.proposals.values() ?? [])].filter((p) => model?.entities.has(p.id)),
    [governance, model]
  )

  useFrame(() => {
    const now = performance.now()
    const alpha = visibilityAt(now, reduced)
    const group = root.current
    if (!group) return
    group.visible = alpha > 0.01
    if (!group.visible) return
    for (let i = 0; i < constellations.length; i++) {
      const sprite = corporationSprites.current[i]
      if (!sprite) continue
      const id = constellations[i].corporation
      const at = positionOf(id)
      sprite.position.set(at[0], at[1], at[2])
      sprite.scale.setScalar(CORPORATION_SCALE * (1 + flashOf(id, now)))
      sprite.material.opacity = 0.75 * alpha * dimFactor(focus, id)
    }
    for (let i = 0; i < members.length; i++) {
      const sprite = memberSprites.current[i]
      if (!sprite) continue
      const mark = members[i]
      const at = positionOf(mark.corporation)
      sprite.position.set(at[0] + mark.offset[0], at[1] + mark.offset[1], at[2] + mark.offset[2])
      sprite.scale.setScalar(mark.size * MEMBER_SCALE)
      sprite.material.opacity = 0.85 * alpha * dimFactor(focus, mark.corporation)
    }
    for (let i = 0; i < proposals.length; i++) {
      const sprite = proposalSprites.current[i]
      if (!sprite) continue
      const p = proposals[i]
      const at = positionOf(p.id)
      sprite.position.set(at[0], at[1], at[2])
      const flash = flashOf(p.id, now)
      sprite.scale.setScalar(PROPOSAL_SCALE * proposalPulse(p.open, now, reduced) * (1 + flash))
      sprite.material.opacity = (p.open ? 0.95 : 0.55) * alpha * dimFactor(focus, p.id) + flash * 0.4
    }
  })

  if (!governance) return null
  return (
    <group ref={root}>
      {constellations.map((c, i) => (
        <sprite
          key={c.corporation}
          ref={(sprite) => {
            corporationSprites.current[i] = sprite
          }}
        >
          <spriteMaterial
            map={texture}
            color={CORPORATION_COLOR}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
          />
        </sprite>
      ))}
      {members.map((mark, i) => (
        <sprite
          key={mark.key}
          ref={(sprite) => {
            memberSprites.current[i] = sprite
          }}
        >
          <spriteMaterial
            map={texture}
            color={MEMBER_COLOR}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
          />
        </sprite>
      ))}
      {proposals.map((p, i) => (
        <sprite
          key={p.id}
          ref={(sprite) => {
            proposalSprites.current[i] = sprite
          }}
        >
          <spriteMaterial
            map={texture}
            color={proposalColor(p)}
            blending={AdditiveBlending}
            depthWrite={false}
            transparent
          />
        </sprite>
      ))}
      <ProposalHits proposals={proposals} positionOf={positionOf} />
    </group>
  )
}
