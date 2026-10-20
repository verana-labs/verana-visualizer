import { effectiveEnd, isExpiringSoon } from '@/domain/expiry'
import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { compareIds, ecosystemOrder, placeAgents, placeSchemasAndCorporations } from './shared'
import type { Layout, LensExtras, Vec3 } from './types'

const STATE_ORDER = ['PENDING', 'VALIDATED', 'TERMINATED']
const EXPIRING = 'EXPIRING'
const CELL = 2.6
const COLUMN_GAP = 12
const BOARD_TOP = 30
const ECOSYSTEM_RISE = 16
const ECOSYSTEM_PITCH = 7
const ECOSYSTEM_STAGGER = 6
const CORE_DROP = 26

export interface BoardColumn {
  key: string
  count: number
  left: number
  right: number
  top: number
  bottom: number
}

export interface RegistryBoard {
  layout: Layout
  columns: BoardColumn[]
}

function columnKeys(groups: Map<string, Entity[]>): string[] {
  const extra = [...groups.keys()].filter((key) => !STATE_ORDER.includes(key) && key !== EXPIRING).sort()
  return [...STATE_ORDER, ...extra, EXPIRING].filter((key) => (groups.get(key)?.length ?? 0) > 0)
}

export function registryBoard(model: NetworkModel, now: Date): RegistryBoard {
  const raw = new Map(model.raw.participants.map((p) => [`participant:${p.id}` as EntityId, p]))
  const rank = new Map(ecosystemOrder(model).map((eco, i) => [eco.ecosystemId, i]))
  const endOf = (id: EntityId) => {
    const p = raw.get(id)
    return p ? effectiveEnd(p) : Number.NaN
  }
  const groups = new Map<string, Entity[]>()
  for (const participant of model.participants) {
    const p = raw.get(participant.id)
    if (!p) throw new Error(`Registry layout: ${participant.id} has no participant row`)
    const key = isExpiringSoon(p, now) ? EXPIRING : p.op_state
    const group = groups.get(key)
    if (group) group.push(participant)
    else groups.set(key, [participant])
  }

  const positions = new Map<EntityId, Vec3>()
  const columns: BoardColumn[] = []
  const keys = columnKeys(groups)
  const widths = keys.map((key) => (key === EXPIRING ? 1 : Math.ceil(Math.sqrt((groups.get(key)?.length ?? 0) * 1.5))))
  const boardWidth = widths.reduce((sum, w) => sum + w * CELL, 0) + COLUMN_GAP * Math.max(0, keys.length - 1)
  let left = -boardWidth / 2
  for (const [i, key] of keys.entries()) {
    const members = [...(groups.get(key) ?? [])].sort((a, b) =>
      key === EXPIRING
        ? endOf(a.id) - endOf(b.id) || compareIds(a, b)
        : (rank.get(a.ecosystemId) ?? 0) - (rank.get(b.ecosystemId) ?? 0) ||
          (raw.get(a.id)?.schema_id ?? 0) - (raw.get(b.id)?.schema_id ?? 0) ||
          compareIds(a, b)
    )
    const perRow = widths[i]
    members.forEach((member, n) => {
      positions.set(member.id, [left + ((n % perRow) + 0.5) * CELL, BOARD_TOP - Math.floor(n / perRow) * CELL, 0])
    })
    const rows = Math.ceil(members.length / perRow)
    columns.push({
      key,
      count: members.length,
      left,
      right: left + perRow * CELL,
      top: BOARD_TOP,
      bottom: BOARD_TOP - rows * CELL,
    })
    left += perRow * CELL + COLUMN_GAP
  }

  const ecosystems = ecosystemOrder(model)
  ecosystems.forEach((eco, i) => {
    positions.set(eco.id, [
      (i - (ecosystems.length - 1) / 2) * ECOSYSTEM_PITCH,
      BOARD_TOP + ECOSYSTEM_RISE + (i % 2) * ECOSYSTEM_STAGGER,
      0,
    ])
  })

  const lowest = Math.min(BOARD_TOP, ...columns.map((c) => c.bottom))
  const core: Vec3 = [0, lowest - CORE_DROP, 0]
  placeSchemasAndCorporations(model, positions, core)
  placeAgents(model, positions, core, (anchor, random) => [
    anchor[0] + (random() - 0.5) * 0.8,
    anchor[1] + (random() - 0.5) * 0.8,
    anchor[2] + 4 + random() * 2,
  ])

  return { layout: { positions, corePosition: core }, columns }
}

const boards = new WeakMap<NetworkModel, RegistryBoard>()

export function cachedRegistryBoard(model: NetworkModel): RegistryBoard {
  const cached = boards.get(model)
  if (cached) return cached
  const board = registryBoard(model, new Date())
  boards.set(model, board)
  return board
}

export function registryLayout(model: NetworkModel, extras: LensExtras & { now?: Date } = {}): Layout {
  return extras.now ? registryBoard(model, extras.now).layout : cachedRegistryBoard(model).layout
}
