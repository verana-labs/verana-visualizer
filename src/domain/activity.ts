import type { EntityId } from './network-model'

export const FEED_SIZE = 6

export interface CometLaunch {
  target: EntityId
  color: string
}

export interface FeedItem {
  key: string
  name: string
  module: string
  color: string
  where: string
  touched: boolean
  block: number
  timestamp: string
}

export function appendFeed(feed: FeedItem[], item: FeedItem): FeedItem[] {
  return [item, ...feed].slice(0, FEED_SIZE)
}
