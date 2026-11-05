import { renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { testnetCfg } from '../../../tests/support/network'
import {
  connectIndexerSocket,
  type LiveBlock,
  MAX_RECONNECT_MS,
  RECONNECT_MS,
  useIndexerBlocks,
} from './indexer-socket'

class MockSocket {
  static instances: MockSocket[] = []
  sent: string[] = []
  closed = false
  readyState = 1
  onopen: (() => void) | null = null
  onmessage: ((message: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public url: string) {
    MockSocket.instances.push(this)
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.closed = true
    this.onclose?.()
  }
  receive(payload: unknown) {
    this.onmessage?.({ data: typeof payload === 'string' ? payload : JSON.stringify(payload) })
  }
  drop() {
    this.onclose?.()
  }
}

const URL = 'wss://idx.testnet.verana.network/v4/indexer/subscribe'
const latest = () => MockSocket.instances[MockSocket.instances.length - 1]
const create = (url: string) => new MockSocket(url) as unknown as WebSocket

const blockMessage = {
  type: 'block',
  block: 97_498,
  blockTime: '2026-10-20T12:01:50.216Z',
  events: [
    {
      type: 'indexer-event',
      event_type: 'CreateNewCorporation',
      did: 'did:web:a.example',
      block_height: 97_498,
      tx_hash: 'ABC',
      timestamp: '2026-10-20T12:01:50Z',
      payload: { module: 'co' },
    },
  ],
}

beforeEach(() => {
  MockSocket.instances = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('connectIndexerSocket', () => {
  it('subscribes once the server says ready', () => {
    const dispose = connectIndexerSocket(URL, () => {}, create)
    expect(latest().url).toBe(URL)
    expect(latest().sent).toEqual([])
    latest().receive({ type: 'ready', block: 97_497, blockTime: '2026-10-20T12:01:38.666Z', blockIntervalMs: 6000 })
    expect(latest().sent.map((s) => JSON.parse(s))).toEqual([{ action: 'subscribe' }])
    dispose()
  })

  it('hands every block to the listener with its events', () => {
    const onBlock = vi.fn<(b: LiveBlock) => void>()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    latest().receive({ type: 'subscribed', block: 97_497 })
    latest().receive(blockMessage)
    expect(onBlock).toHaveBeenCalledTimes(1)
    expect(onBlock.mock.calls[0][0]).toMatchObject({ block: 97_498, blockTime: '2026-10-20T12:01:50.216Z' })
    expect(onBlock.mock.calls[0][0].events[0].event_type).toBe('CreateNewCorporation')
    dispose()
  })

  it('logs and ignores malformed messages without crashing', () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const onBlock = vi.fn()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    latest().receive('not json')
    latest().receive({ type: 'block', block: 'tall' })
    latest().receive({ nope: true })
    expect(onBlock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(3)
    dispose()
  })

  it('drops a malformed event but keeps the block', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const onBlock = vi.fn<(b: LiveBlock) => void>()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    latest().receive({ ...blockMessage, events: [...blockMessage.events, { event_type: 3 }] })
    expect(onBlock.mock.calls[0][0].events).toHaveLength(1)
    dispose()
  })

  it('drops an event whose timestamp is not a date', () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => {})
    const onBlock = vi.fn<(b: LiveBlock) => void>()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    latest().receive({ ...blockMessage, events: [{ ...blockMessage.events[0], timestamp: 'soon' }] })
    expect(onBlock.mock.calls[0][0].events).toEqual([])
    dispose()
  })

  it('keeps retrying when opening the socket throws', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {})
    let fail = false
    const flaky = (url: string) => {
      if (fail) {
        fail = false
        throw new Error('blocked')
      }
      return create(url)
    }
    const dispose = connectIndexerSocket(URL, () => {}, flaky)
    fail = true
    latest().drop()
    expect(() => vi.advanceTimersByTime(RECONNECT_MS)).not.toThrow()
    expect(error).toHaveBeenCalledTimes(1)
    expect(MockSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(2 * RECONNECT_MS)
    expect(MockSocket.instances).toHaveLength(2)
    dispose()
  })

  it('closes a still-connecting socket once it opens, without delivering anything', () => {
    const onBlock = vi.fn()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    const socket = latest()
    socket.readyState = 0
    dispose()
    expect(socket.closed).toBe(false)
    socket.readyState = 1
    socket.onopen?.()
    expect(socket.closed).toBe(true)
    socket.receive(blockMessage)
    expect(onBlock).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10_000)
    expect(MockSocket.instances).toHaveLength(1)
  })

  it('reconnects 3 s after the socket closes, with nothing invented in between', () => {
    const onBlock = vi.fn()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    latest().drop()
    vi.advanceTimersByTime(2999)
    expect(MockSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(MockSocket.instances).toHaveLength(2)
    expect(onBlock).not.toHaveBeenCalled()
    dispose()
  })

  it('backs off exponentially up to a cap while the indexer stays down, and resets once it answers', () => {
    const dispose = connectIndexerSocket(URL, () => {}, create)
    const delays: number[] = []
    for (let attempt = 0; attempt < 6; attempt++) {
      const before = MockSocket.instances.length
      latest().drop()
      let waited = 0
      while (MockSocket.instances.length === before) {
        vi.advanceTimersByTime(1000)
        waited += 1000
      }
      delays.push(waited)
    }
    expect(delays).toEqual([3000, 6000, 12000, 24000, MAX_RECONNECT_MS, MAX_RECONNECT_MS])
    latest().receive({ type: 'ready' })
    latest().drop()
    vi.advanceTimersByTime(RECONNECT_MS)
    expect(MockSocket.instances).toHaveLength(8)
    dispose()
  })

  it('stops for good once disposed', () => {
    const dispose = connectIndexerSocket(URL, () => {}, create)
    const socket = latest()
    dispose()
    expect(socket.closed).toBe(true)
    vi.advanceTimersByTime(10_000)
    expect(MockSocket.instances).toHaveLength(1)
  })
})

describe('useIndexerBlocks', () => {
  it('opens the indexer socket and closes it on unmount', () => {
    vi.stubGlobal('WebSocket', MockSocket)
    const onBlock = vi.fn()
    const { unmount } = renderHook(() => useIndexerBlocks(testnetCfg, onBlock))
    expect(latest().url).toBe(URL)
    latest().receive(blockMessage)
    expect(onBlock).toHaveBeenCalledTimes(1)
    unmount()
    expect(latest().closed).toBe(true)
    vi.unstubAllGlobals()
  })

  it('leaves exactly one live socket under Strict Mode double mount', () => {
    vi.stubGlobal('WebSocket', MockSocket)
    const { unmount } = renderHook(() => useIndexerBlocks(testnetCfg, () => {}), { wrapper: StrictMode })
    expect(MockSocket.instances.filter((s) => !s.closed)).toHaveLength(1)
    vi.advanceTimersByTime(10_000)
    expect(MockSocket.instances.filter((s) => !s.closed)).toHaveLength(1)
    unmount()
    expect(MockSocket.instances.filter((s) => !s.closed)).toHaveLength(0)
    vi.unstubAllGlobals()
  })
})
