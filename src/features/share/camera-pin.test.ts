import { PerspectiveCamera, Vector3 } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useObservatory } from '@/store/observatory-store'
import { pinCamera } from './camera-pin'

const rig = () => {
  const camera = new PerspectiveCamera()
  const controls = {
    target: new Vector3(),
    minDistance: 0,
    maxDistance: Number.POSITIVE_INFINITY,
    update: vi.fn(),
    dispatchEvent: vi.fn(),
  }
  return { camera, controls }
}

afterEach(() => useObservatory.setState({ lens: 'network', selected: null }))

describe('pinCamera', () => {
  it('holds a shared camera against later rig flights, such as the governance model swap', () => {
    useObservatory.setState({ lens: 'governance', selected: 'corporation:3' })
    const { camera, controls } = rig()
    const pin = pinCamera([10, 30, 120, 5, -2, 3])
    pin.enforce(camera, controls)
    expect(camera.position.toArray()).toEqual([10, 30, 120])
    expect(controls.target.toArray()).toEqual([5, -2, 3])

    camera.position.set(20.78, 13.69, 71.98)
    controls.target.set(17.7, -6, 0)
    controls.dispatchEvent.mockClear()
    pin.enforce(camera, controls)
    expect(controls.dispatchEvent).toHaveBeenCalledWith({ type: 'start' })
    expect(camera.position.toArray()).toEqual([10, 30, 120])
    expect(controls.target.toArray()).toEqual([5, -2, 3])
    pin.release()
  })

  it('clamps a shared camera to the zoom limits once instead of fighting the controls every frame', () => {
    const { camera, controls } = rig()
    controls.minDistance = 50
    controls.update.mockImplementation(() => {
      const offset = camera.position.clone().sub(controls.target)
      if (offset.length() < controls.minDistance)
        camera.position.copy(controls.target).addScaledVector(offset.normalize(), 50)
    })
    const pin = pinCamera([0, 0, 10, 0, 0, 0])
    for (let frame = 0; frame < 5; frame++) pin.enforce(camera, controls)
    expect(controls.dispatchEvent).toHaveBeenCalledTimes(1)
    expect(camera.position.toArray()).toEqual([0, 0, 50])
    pin.release()
  })

  it('lets go on user input', () => {
    const { camera, controls } = rig()
    const pin = pinCamera([10, 30, 120, 5, -2, 3])
    window.dispatchEvent(new Event('pointerdown'))
    camera.position.set(1, 1, 1)
    pin.enforce(camera, controls)
    expect(camera.position.toArray()).toEqual([1, 1, 1])
  })

  it('lets go when the lens or the selection changes to something else', () => {
    useObservatory.setState({ lens: 'network', selected: 'ecosystem:2' })
    const { camera, controls } = rig()
    const pin = pinCamera([10, 30, 120, 5, -2, 3])
    useObservatory.setState({ selected: 'ecosystem:5' })
    camera.position.set(1, 1, 1)
    pin.enforce(camera, controls)
    expect(camera.position.toArray()).toEqual([1, 1, 1])
  })
})
