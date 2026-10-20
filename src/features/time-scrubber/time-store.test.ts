import { InstancedMesh, Matrix4, MeshBasicMaterial, SphereGeometry, Vector3 } from 'three'
import { beforeEach, describe, expect, it } from 'vitest'
import { testnetModel } from '@/features/search/search-fixture'
import { buildSceneData } from '@/scene/scene-data'
import { isHittableInstance } from '@/scene/use-picking'
import { FADE_MS, presenceOf, useTimeStore } from './time-store'

beforeEach(() => useTimeStore.getState().reset())

describe('presence of an entity absent at h', () => {
  it('fades out over FADE_MS and keeps its id in the scene', () => {
    const model = testnetModel()
    const id = 'ecosystem:14' as const
    useTimeStore.getState().setAbsent(new Set([id]), 1000)
    const state = useTimeStore.getState()
    expect(presenceOf(id, state, 1000, false)).toBe(1)
    const mid = presenceOf(id, state, 1000 + FADE_MS / 2, false)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(presenceOf(id, state, 1000 + FADE_MS, false)).toBe(0)
    expect(presenceOf('ecosystem:1', state, 1000 + FADE_MS / 2, false)).toBe(1)
    expect(buildSceneData(model).nodes.some((n) => n.entity.id === id)).toBe(true)
  })

  it('jumps without a fade under reduced motion', () => {
    useTimeStore.getState().setAbsent(new Set(['ecosystem:14']), 1000)
    expect(presenceOf('ecosystem:14', useTimeStore.getState(), 1000, true)).toBe(0)
  })

  it('fades back in when it reappears or the lens leaves', () => {
    useTimeStore.getState().setAbsent(new Set(['ecosystem:14']), 0)
    useTimeStore.getState().setAbsent(null, 5000)
    const state = useTimeStore.getState()
    expect(presenceOf('ecosystem:14', state, 5000, false)).toBe(0)
    expect(presenceOf('ecosystem:14', state, 5000 + FADE_MS, false)).toBe(1)
  })

  it('is not hittable once faded, because its instance scale is zero', () => {
    useTimeStore.getState().setAbsent(new Set(['ecosystem:14']), 0)
    const presence = presenceOf('ecosystem:14', useTimeStore.getState(), FADE_MS, false)
    const mesh = new InstancedMesh(new SphereGeometry(1), new MeshBasicMaterial(), 1)
    mesh.setMatrixAt(0, new Matrix4().compose(new Vector3(), mesh.quaternion, new Vector3().setScalar(presence)))
    expect(isHittableInstance(mesh, 0)).toBe(false)
  })
})
