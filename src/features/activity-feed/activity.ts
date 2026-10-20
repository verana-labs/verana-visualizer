import type { CometLaunch, FeedItem } from '@/domain/activity'
import { touchedEntities } from '@/domain/events'
import type { EntityId, EntityKind, NetworkModel } from '@/domain/network-model'
import type { IndexerEvent } from '@/lib/api/schemas'

export const MODULE_COLORS: Readonly<Record<string, string>> = {
  co: '#c4b5fd',
  ec: '#ffffff',
  cs: '#60a5fa',
  pp: '#34d399',
  td: '#fbbf24',
  de: '#94a3b8',
  di: '#f472b6',
  xr: '#2dd4bf',
  gf: '#e9d5ff',
  group: '#a78bfa',
}

export const COMETS_PER_EVENT = 6

const FALLBACK_COLOR = MODULE_COLORS.co
const RENDERED_KINDS: ReadonlySet<EntityKind> = new Set(['ecosystem', 'participant', 'agent'])

export function moduleColor(module: string | undefined): string {
  return (module && MODULE_COLORS[module]) || FALLBACK_COLOR
}

export function humanizeEventType(type: string): string {
  const words = type
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase()))
  const sentence = words.join(' ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}

const moduleOf = (ev: IndexerEvent) => (typeof ev.payload.module === 'string' ? ev.payload.module : '')

function renderedTargets(ev: IndexerEvent, model: NetworkModel): EntityId[] {
  const targets = new Set<EntityId>()
  for (const id of touchedEntities(ev, model)) {
    const shown = model.chainToRoot(id).find((step) => {
      const kind = model.entities.get(step)?.kind
      return kind !== undefined && RENDERED_KINDS.has(kind)
    })
    if (shown) targets.add(shown)
  }
  return [...targets]
}

export function cometsFor(ev: IndexerEvent, model: NetworkModel): CometLaunch[] {
  const color = moduleColor(moduleOf(ev))
  return renderedTargets(ev, model)
    .slice(0, COMETS_PER_EVENT)
    .map((target) => ({ target, color }))
}

function whereOf(ev: IndexerEvent, model: NetworkModel | null): { where: string; touched: boolean } {
  if (!model) return { where: ev.did ?? '', touched: false }
  const entities = renderedTargets(ev, model).flatMap((id) => model.entities.get(id) ?? [])
  const pick = entities.find((e) => e.kind === 'ecosystem') ?? entities.find((e) => e.kind === 'agent') ?? entities[0]
  const ecosystem = pick?.ecosystemId == null ? undefined : model.entities.get(`ecosystem:${pick.ecosystemId}`)
  const where = pick?.kind === 'participant' && ecosystem ? ecosystem.name : (pick?.name ?? ev.did ?? '')
  return { where, touched: entities.length > 0 }
}

let feedSequence = 0

export function feedItemOf(ev: IndexerEvent, model: NetworkModel | null): FeedItem {
  const module = moduleOf(ev)
  const action = typeof ev.payload.action === 'string' ? ev.payload.action : 'event'
  feedSequence += 1
  return {
    key: `${ev.block_height}:${ev.tx_hash ?? ''}:${ev.event_type}:${feedSequence}`,
    name: humanizeEventType(ev.event_type || action),
    module,
    color: moduleColor(module),
    ...whereOf(ev, model),
    block: ev.block_height,
    timestamp: ev.timestamp,
  }
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86_400],
  ['month', 30 * 86_400],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
]
const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function relativeAge(timestamp: string, now: number): string | null {
  const seconds = Math.round((Date.parse(timestamp) - now) / 1000)
  if (Number.isNaN(seconds)) return null
  if (Math.abs(seconds) < 10) return 'now'
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? UNITS[UNITS.length - 1]
  return relativeFormat.format(Math.round(seconds / size), unit)
}
