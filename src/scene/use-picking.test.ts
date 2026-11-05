import { InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Raycaster, SphereGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { isHittableInstance } from './use-picking'

function meshWith(scales: number[]) {
  const mesh = new InstancedMesh(new SphereGeometry(1, 8, 6), new MeshBasicMaterial(), scales.length)
  scales.forEach((scale, i) => {
    mesh.setMatrixAt(
      i,
      new Matrix4().compose(new Vector3(i * 10, 0, 0), new Quaternion(), new Vector3().setScalar(scale))
    )
  })
  return mesh
}

describe('isHittableInstance', () => {
  it('rejects zero-scale instances and accepts visible ones', () => {
    const mesh = meshWith([1, 0])
    expect(isHittableInstance(mesh, 0)).toBe(true)
    expect(isHittableInstance(mesh, 1)).toBe(false)
    expect(isHittableInstance(mesh, undefined)).toBe(false)
  })

  it('agrees with what a ray can actually hit', () => {
    const mesh = meshWith([1, 0])
    mesh.computeBoundingSphere()
    const hitsAt = (x: number) =>
      new Raycaster(new Vector3(x, 0, 50), new Vector3(0, 0, -1)).intersectObject(mesh).map((hit) => hit.instanceId)
    expect(hitsAt(0)).toContain(0)
    expect(hitsAt(10)).toEqual([])
  })
})
