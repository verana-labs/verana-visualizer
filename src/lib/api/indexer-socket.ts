import { useEffect, useRef } from 'react'
import { z } from 'zod'
import type { NetworkConfig } from '../env'
import { logger } from '../logger'
import { type IndexerEvent, indexerEventSchema } from './schemas'

export const RECONNECT_MS = 3000
const CONNECTING = 0

export interface LiveBlock {
  block: number
  blockTime: string
  events: IndexerEvent[]
}

const envelopeSchema = z.object({ type: z.string() }).passthrough()
const blockSchema = z
  .object({
    type: z.literal('block'),
    block: z.number().int().nonnegative(),
    blockTime: z.string(),
    events: z.array(z.unknown()).default([]),
  })
  .passthrough()

type SocketMessage = { kind: 'ready' } | { kind: 'block'; block: LiveBlock } | { kind: 'other' } | { kind: 'invalid' }

function parseJson(data: unknown): unknown {
  if (typeof data !== 'string') return undefined
  try {
    return JSON.parse(data)
  } catch {
    return undefined
  }
}

function parseMessage(url: string, data: unknown): SocketMessage {
  const envelope = envelopeSchema.safeParse(parseJson(data))
  if (!envelope.success) {
    logger.warn(`Ignoring a malformed message from ${url}`, data)
    return { kind: 'invalid' }
  }
  if (envelope.data.type === 'ready') return { kind: 'ready' }
  if (envelope.data.type !== 'block') return { kind: 'other' }

  const block = blockSchema.safeParse(envelope.data)
  if (!block.success) {
    logger.warn(`Ignoring a malformed block from ${url}`, block.error.issues)
    return { kind: 'invalid' }
  }
  const events = block.data.events.flatMap((raw) => {
    const ev = indexerEventSchema.safeParse(raw)
    if (ev.success) return [ev.data]
    logger.warn(`Dropping a malformed event in block ${block.data.block} from ${url}`, ev.error.issues)
    return []
  })
  return { kind: 'block', block: { block: block.data.block, blockTime: block.data.blockTime, events } }
}

export function connectIndexerSocket(
  url: string,
  onBlock: (block: LiveBlock) => void,
  createSocket: (url: string) => WebSocket = (u) => new WebSocket(u)
): () => void {
  let socket: WebSocket | null = null
  let retry: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const scheduleRetry = () => {
    retry = setTimeout(connect, RECONNECT_MS)
  }

  function connect() {
    let current: WebSocket
    try {
      current = createSocket(url)
    } catch (error) {
      logger.error(`Cannot open the indexer socket ${url}`, error)
      scheduleRetry()
      return
    }
    socket = current
    current.onmessage = (message) => {
      if (disposed) return
      const parsed = parseMessage(url, message.data)
      if (parsed.kind === 'ready') current.send(JSON.stringify({ action: 'subscribe' }))
      if (parsed.kind === 'block') onBlock(parsed.block)
    }
    current.onclose = () => {
      if (disposed || socket !== current) return
      scheduleRetry()
    }
  }

  connect()
  return () => {
    disposed = true
    clearTimeout(retry)
    const current = socket
    if (!current) return
    current.onmessage = null
    // closing a CONNECTING socket makes browsers log a failed-connection error
    if (current.readyState === CONNECTING) current.onopen = () => current.close()
    else current.close()
  }
}

export function useIndexerBlocks(cfg: NetworkConfig, onBlock: (block: LiveBlock) => void): void {
  const listener = useRef(onBlock)
  listener.current = onBlock
  useEffect(() => connectIndexerSocket(cfg.indexerWsUrl, (block) => listener.current(block)), [cfg.indexerWsUrl])
}
