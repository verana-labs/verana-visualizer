'use client'

import { OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { useMemo, useState } from 'react'
import type { NetworkModel } from '@/domain/network-model'
import { useObservatory } from '@/store/observatory-store'
import { Agents } from './agents'
import { CameraRig } from './camera-rig'
import { ChainCore } from './chain-core'
import { Comets } from './comets'
import { FlowParticles } from './flow-particles'
import { Halos } from './halos'
import { HoverMarker } from './hover-marker'
import { Labels } from './labels'
import { Links } from './links'
import { Nodes } from './nodes'
import { RegistryBoard } from './registry-board'
import { Reservoirs } from './reservoirs'
import { Rings } from './rings'
import { Ripples } from './ripples'
import { buildSceneData } from './scene-data'
import { useFocusSets } from './scene-focus'
import { Sky } from './sky'
import { TrustTrace } from './trust-trace'
import { useLensTween } from './use-lens-tween'
import { usePrefersReducedMotion } from './use-reduced-motion'

const BACKGROUND = '#05040a'
const FOG_DENSITY = 0.0028
const EXPOSURE = 0.92
const ZOOM_SPEED = 2.2
// postprocessing is only a transitive dependency; 6 is its ToneMappingMode.ACES_FILMIC
const ACES_FILMIC = 6
const QUALITY = [
  { dpr: 1.75, bloomLevels: 8 },
  { dpr: 1.25, bloomLevels: 6 },
  { dpr: 1, bloomLevels: 4 },
] as const

function Galaxy({ model }: { model: NetworkModel }) {
  const data = useMemo(() => buildSceneData(model), [model])
  const ids = useMemo(() => [...data.nodes.map((node) => node.entity.id), ...data.agents.map((a) => a.id)], [data])
  const positionOf = useLensTween()
  const focus = useFocusSets()
  return (
    <>
      <Rings />
      <Links data={data} positionOf={positionOf} focus={focus} />
      <FlowParticles data={data} positionOf={positionOf} focus={focus} />
      <Nodes nodes={data.nodes} positionOf={positionOf} focus={focus} />
      <Halos stars={data.stars} positionOf={positionOf} focus={focus} />
      <Reservoirs stars={data.stars} positionOf={positionOf} />
      <Labels stars={data.stars} positionOf={positionOf} focus={focus} />
      <RegistryBoard />
      <Agents agents={data.agents} positionOf={positionOf} focus={focus} />
      <HoverMarker marks={data.marks} positionOf={positionOf} />
      <Ripples marks={data.marks} positionOf={positionOf} />
      <ChainCore />
      <Comets positionOf={positionOf} />
      <TrustTrace positionOf={positionOf} />
      <CameraRig ids={ids} />
    </>
  )
}

export function ObservatoryCanvas({ model }: { model: NetworkModel }) {
  const reduced = usePrefersReducedMotion()
  const [level, setLevel] = useState(0)
  const quality = QUALITY[level]
  const stepDown = () => setLevel((l) => Math.min(QUALITY.length - 1, l + 1))
  const stepUp = () => setLevel((l) => Math.max(0, l - 1))

  return (
    <div className="fixed inset-0 z-0" data-testid="observatory-canvas">
      <Canvas
        dpr={[1, quality.dpr]}
        camera={{ fov: 50, near: 0.1, far: 3000, position: [0, 420, 900] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = EXPOSURE
        }}
        onPointerMissed={() => useObservatory.getState().select(null)}
      >
        <color attach="background" args={[BACKGROUND]} />
        <fogExp2 attach="fog" args={[BACKGROUND, FOG_DENSITY]} />
        <PerformanceMonitor onDecline={stepDown} onIncline={stepUp} onFallback={() => setLevel(QUALITY.length - 1)} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          autoRotate={!reduced}
          autoRotateSpeed={0.25}
          zoomSpeed={ZOOM_SPEED}
        />
        <Sky />
        <Galaxy model={model} />
        <EffectComposer>
          <Bloom mipmapBlur intensity={0.55} radius={0.4} luminanceThreshold={0.32} levels={quality.bloomLevels} />
          <ToneMapping mode={ACES_FILMIC} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
