import { describe, expect, it, vi } from 'vitest'
import { writeOpacity } from './dom-opacity'

const element = () => {
  let value = ''
  const set = vi.fn((next: string) => {
    value = next
  })
  const style = {
    get opacity() {
      return value
    },
    set opacity(next: string) {
      set(next)
    },
  }
  return { el: { style } as unknown as HTMLElement, set }
}

describe('writeOpacity', () => {
  it('touches the DOM only when the rounded opacity changes', () => {
    const { el, set } = element()
    writeOpacity(el, 0.5)
    writeOpacity(el, 0.5)
    writeOpacity(el, 0.5004)
    expect(set).toHaveBeenCalledTimes(1)
    writeOpacity(el, 0.25)
    expect(set).toHaveBeenLastCalledWith('0.25')
    expect(set).toHaveBeenCalledTimes(2)
  })

  it('ignores a missing element', () => {
    expect(() => writeOpacity(null, 1)).not.toThrow()
  })
})
