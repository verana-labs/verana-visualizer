'use client'

import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { AdditiveBlending, type Group, type Material, type Mesh } from 'three'
import type { ValidatorOrb } from '@/features/chain-stats/chain-scene'
import type { BlockSummary } from '@/features/chain-stats/load-chain-stats'
import { blockRise, STREAM_SIZE, VALIDATOR_RING_RADIUS } from '@/layouts/chain'
import { useObservatory } from '@/store/observatory-store'
import { writeOpacity } from './dom-opacity'
import { useGlowTexture } from './glow-texture'
import { LABEL_CLASS } from './labels'
import { SceneHtml } from './scene-html'
import { lensVisibility, TWEEN_MS, tweenProgress, useCoreTween } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const ORB_COLOR = '#a78bfa'
const IDLE_ORB_COLOR = '#64748b'
const RING_COLOR = '#a78bfa'
const DISC_COLOR = '#a78bfa'
const BUSY_DISC_COLOR = '#38E1FF'
const DISC_RADIUS = 2
const DISC_THICKNESS = 0.14
const RISE_PER_S = 9
const RING_TURN_MS = 90_000

interface Fadeable {
  material: Material | Material[]
}

function setOpacity(object: Fadeable | null, opacity: number) {
  if (!object) return
  if (!Array.isArray(object.material)) {
    object.material.opacity = opacity
    return
  }
  for (const material of object.material) material.opacity = opacity
}

function useChainFade(): () => number {
  const reduced = usePrefersReducedMotion()
  return () => {
    const { lens, lensFrom, lensChangedAt } = useObservatory.getState()
    return lensVisibility('chain', lens, lensFrom, tweenProgress(performance.now(), lensChangedAt, 0, reduced), 2)
  }
}

const percent = (share: number) => `${(share * 100).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`

function ValidatorRing({ orbs }: { orbs: ValidatorOrb[] }) {
  const glow = useGlowTexture()
  const reduced = usePrefersReducedMotion()
  const fadeOf = useChainFade()
  const coreAt = useCoreTween()
  const group = useRef<Group>(null)
  const spin = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const meshes = useRef<(Mesh | null)[]>([])
  const halos = useRef<(Fadeable | null)[]>([])
  const labels = useRef<(HTMLDivElement | null)[]>([])

  useFrame(() => {
    const fade = fadeOf()
    if (group.current) {
      group.current.visible = fade > 0.001
      group.current.position.set(...coreAt())
    }
    if (spin.current && !reduced) spin.current.rotation.y = (performance.now() / RING_TURN_MS) * Math.PI * 2
    setOpacity(ring.current, 0.28 * fade)
    for (let i = 0; i < orbs.length; i++) {
      const active = orbs[i].active
      setOpacity(meshes.current[i], (active ? 0.95 : 0.5) * fade)
      setOpacity(halos.current[i], (active ? 0.35 : 0.1) * fade)
      writeOpacity(labels.current[i], fade)
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[VALIDATOR_RING_RADIUS, 0.04, 8, 160]} />
        <meshBasicMaterial color={RING_COLOR} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={spin}>
        {orbs.map((orb, i) => {
          const x = Math.cos(orb.angle) * VALIDATOR_RING_RADIUS
          const z = Math.sin(orb.angle) * VALIDATOR_RING_RADIUS
          const color = orb.active ? ORB_COLOR : IDLE_ORB_COLOR
          return (
            <group key={orb.address} position={[x, 0, z]}>
              <mesh
                ref={(mesh) => {
                  meshes.current[i] = mesh
                }}
                scale={orb.size}
              >
                <sphereGeometry args={[1, 24, 16]} />
                <meshBasicMaterial color={color} transparent opacity={0} />
              </mesh>
              <sprite
                ref={(sprite) => {
                  halos.current[i] = sprite
                }}
                scale={orb.size * 4.2}
              >
                <spriteMaterial
                  map={glow}
                  color={color}
                  blending={AdditiveBlending}
                  depthWrite={false}
                  transparent
                  opacity={0}
                />
              </sprite>
              <SceneHtml>
                <div
                  ref={(div) => {
                    labels.current[i] = div
                  }}
                  className={`${LABEL_CLASS} translate-y-[22px] text-center text-[rgba(236,232,255,.9)]`}
                >
                  {orb.moniker}
                  <div className="text-[10px] text-scene-mut">{`${percent(orb.share)} voting power`}</div>
                </div>
              </SceneHtml>
            </group>
          )
        })}
      </group>
    </group>
  )
}

function BlockStream({ blocks }: { blocks: BlockSummary[] }) {
  const fadeOf = useChainFade()
  const coreAt = useCoreTween()
  const reduced = usePrefersReducedMotion()
  const group = useRef<Group>(null)
  const slots = useRef(new Map<number, Group>())
  const discs = useRef(new Map<number, Mesh>())
  const labels = useRef(new Map<number, HTMLDivElement>())
  const heights = useRef(new Map<number, number>())

  useFrame((_, delta) => {
    const fade = fadeOf()
    if (group.current) {
      group.current.visible = fade > 0.001
      group.current.position.set(...coreAt())
    }
    const step = Math.min(delta, 0.5) * RISE_PER_S
    for (let i = 0; i < blocks.length; i++) {
      const height = blocks[i].height
      const target = blockRise(i)
      const current = heights.current.get(height) ?? 0
      const next = reduced ? target : current + Math.min(step, target - current)
      heights.current.set(height, next)
      slots.current.get(height)?.position.set(0, next, 0)
      const age = 1 - i / STREAM_SIZE
      setOpacity(discs.current.get(height) ?? null, (0.12 + 0.5 * age) * fade)
      writeOpacity(labels.current.get(height), (0.35 + 0.65 * age) * fade)
    }
  })

  useEffect(() => {
    const shown = new Set(blocks.map((b) => b.height))
    for (const height of heights.current.keys()) if (!shown.has(height)) heights.current.delete(height)
  }, [blocks])

  return (
    <group ref={group} visible={false}>
      {blocks.map((block) => (
        <group
          key={block.height}
          ref={(slot) => {
            if (slot) slots.current.set(block.height, slot)
            else slots.current.delete(block.height)
          }}
        >
          <mesh
            ref={(disc) => {
              if (disc) discs.current.set(block.height, disc)
              else discs.current.delete(block.height)
            }}
          >
            <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, DISC_THICKNESS, 48]} />
            <meshBasicMaterial
              color={block.txs > 0 ? BUSY_DISC_COLOR : DISC_COLOR}
              transparent
              opacity={0}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <group position={[DISC_RADIUS + 0.6, 0, 0]}>
            <SceneHtml>
              <div
                ref={(div) => {
                  if (div) labels.current.set(block.height, div)
                  else labels.current.delete(block.height)
                }}
                className={`${LABEL_CLASS} translate-x-1/2 text-[10.5px] text-[#c4b5fd]`}
              >
                {`#${block.height.toLocaleString('en-US')} · ${block.txs} tx`}
              </div>
            </SceneHtml>
          </group>
        </group>
      ))}
    </group>
  )
}

export function useChainSceneShown(): boolean {
  const lens = useObservatory((s) => s.lens)
  const lensFrom = useObservatory((s) => s.lensFrom)
  const changedAt = useObservatory((s) => s.lensChangedAt)
  const leaving = lens !== 'chain' && lensFrom === 'chain'
  const [faded, setFaded] = useState<number | null>(null)

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setFaded(changedAt), TWEEN_MS)
    return () => clearTimeout(timer)
  }, [leaving, changedAt])

  return lens === 'chain' || (leaving && faded !== changedAt)
}

export function ChainLensScene() {
  const shown = useChainSceneShown()
  const orbs = useObservatory((s) => s.chainValidators)
  const blocks = useObservatory((s) => s.chainBlocks)
  if (!shown) return null
  return (
    <>
      {orbs && <ValidatorRing orbs={orbs} />}
      <BlockStream blocks={blocks} />
    </>
  )
}
