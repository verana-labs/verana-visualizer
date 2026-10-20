import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveNetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'
import { connectIndexerSocket, type LiveBlock, RECONNECT_MS, useIndexerBlocks } from './indexer-socket'

class MockSocket {
  static instances: MockSocket[] = []
  sent: string[] = []
  closed = false
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

  it('reconnects 3 s after the socket closes, with nothing invented in between', () => {
    const onBlock = vi.fn()
    const dispose = connectIndexerSocket(URL, onBlock, create)
    latest().drop()
    expect(RECONNECT_MS).toBe(3000)
    vi.advanceTimersByTime(2999)
    expect(MockSocket.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(MockSocket.instances).toHaveLength(2)
    expect(onBlock).not.toHaveBeenCalled()
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
  const cfg = resolveNetworkConfig({
    NEXT_PUBLIC_VERANA_INDEXER_BASE_URL: 'https://idx.testnet.verana.network',
    NEXT_PUBLIC_VERANA_RPC_ENDPOINT: 'https://rpc.testnet.verana.network',
    NEXT_PUBLIC_VERANA_REST_ENDPOINT: 'https://api.testnet.verana.network',
    NEXT_PUBLIC_VERANA_CHAIN_ID: 'vna-testnet-1',
  })

  it('opens the indexer socket and closes it on unmount', () => {
    vi.stubGlobal('WebSocket', MockSocket)
    const onBlock = vi.fn()
    const { unmount } = renderHook(() => useIndexerBlocks(cfg, onBlock))
    expect(latest().url).toBe(URL)
    latest().receive(blockMessage)
    expect(onBlock).toHaveBeenCalledTimes(1)
    unmount()
    expect(latest().closed).toBe(true)
    vi.unstubAllGlobals()
  })
})
