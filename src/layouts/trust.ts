import type { Entity, EntityId, NetworkModel } from '@/domain/network-model'
import { compareIds, ecosystemOrder, placeAgents, placeSchemasAndCorporations } from './shared'
import type { Layout, Vec3 } from './types'

const LEAF_SPACING = 2.5
const DEPTH_SPACING = 11
const ROW_WIDTH = 230
const TREE_GAP = 12
const ROW_PITCH = 52
const CORE_DROP = 30

interface Tree {
  nodes: Map<EntityId, { tx: number; depth: number }>
  leaves: number
}

function buildTree(model: NetworkModel, root: Entity, schemaOf: Map<EntityId, number>): Tree {
  const entityOf = (id: EntityId): Entity => {
    const entity = model.entities.get(id)
    if (!entity) throw new Error(`Trust layout: child ${id} of ${root.id} is missing from the model`)
    return entity
  }
  const nodes = new Map<EntityId, { tx: number; depth: number }>()
  let leaf = 0
  const place = (id: EntityId, depth: number) => {
    const kids = model
      .childrenOf(id)
      .filter((child) => model.entities.get(child)?.kind === 'participant')
      .sort((a, b) => (schemaOf.get(a) ?? 0) - (schemaOf.get(b) ?? 0) || compareIds(entityOf(a), entityOf(b)))
    if (kids.length === 0) {
      nodes.set(id, { tx: leaf++, depth })
      return
    }
    for (const kid of kids) place(kid, depth + 1)
    const first = nodes.get(kids[0])?.tx ?? 0
    const last = nodes.get(kids[kids.length - 1])?.tx ?? 0
    nodes.set(id, { tx: (first + last) / 2, depth })
  }
  place(root.id, 0)
  return { nodes, leaves: Math.max(1, leaf) }
}

export function trustLayout(model: NetworkModel): Layout {
  const schemaOf = new Map(model.raw.participants.map((p) => [`participant:${p.id}` as EntityId, p.schema_id]))
  const columns: { tree: Tree; x: number; row: number }[] = []
  let x = 0
  let row = 0
  for (const eco of ecosystemOrder(model)) {
    const tree = buildTree(model, eco, schemaOf)
    const width = tree.leaves * LEAF_SPACING
    if (x + width > ROW_WIDTH && x > 0) {
      x = 0
      row++
    }
    columns.push({ tree, x, row })
    x += width + TREE_GAP
  }

  const rowWidths = new Map<number, number>()
  for (const column of columns)
    rowWidths.set(column.row, Math.max(rowWidths.get(column.row) ?? 0, column.x + column.tree.leaves * LEAF_SPACING))
  const rowCount = columns.length === 0 ? 1 : Math.max(...columns.map((c) => c.row)) + 1

  const positions = new Map<EntityId, Vec3>()
  let lowest = 0
  for (const { tree, x: offset, row: r } of columns) {
    const left = -(rowWidths.get(r) ?? 0) / 2 + offset
    const top = (rowCount - 1) * (ROW_PITCH / 2) - r * ROW_PITCH + 18
    for (const [id, { tx, depth }] of tree.nodes) {
      const y = top - depth * DEPTH_SPACING
      lowest = Math.min(lowest, y)
      positions.set(id, [left + tx * LEAF_SPACING, y, 0])
    }
  }

  const core: Vec3 = [0, lowest - CORE_DROP, 0]
  placeSchemasAndCorporations(model, positions, core)
  placeAgents(model, positions, core, (anchor, random) => {
    const jitterX = (random() - 0.5) * 1.3
    return [anchor[0] + jitterX, anchor[1] - 1.2, anchor[2] + 5 + random() * 2]
  })

  return { positions, corePosition: core }
}
