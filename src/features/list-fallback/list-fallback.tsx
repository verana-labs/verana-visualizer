'use client'

import { useMemo, useState } from 'react'
import type { Entity, NetworkModel } from '@/domain/network-model'
import { AGENT_COLORS } from '@/domain/roles'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'

interface Group {
  key: string
  ecosystem: Entity | null
  title: string
  participants: Entity[]
  agents: Entity[]
}

function groupsOf(model: NetworkModel): Group[] {
  const byEcosystem = (list: Entity[], ecosystemId: number | null) => list.filter((e) => e.ecosystemId === ecosystemId)
  const groups = model.ecosystems.map((eco) => ({
    key: eco.id,
    ecosystem: eco,
    title: eco.name,
    participants: byEcosystem(model.participants, eco.ecosystemId),
    agents: byEcosystem(model.agents, eco.ecosystemId),
  }))
  const loose = byEcosystem(model.agents, null)
  return loose.length > 0
    ? [...groups, { key: 'loose', ecosystem: null, title: 'Other services', participants: [], agents: loose }]
    : groups
}

function narrow(groups: Group[], query: string): Group[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return groups
  const hit = (entity: Entity) => entity.name.toLowerCase().includes(needle)
  return groups.flatMap((group) => {
    if (group.title.toLowerCase().includes(needle)) return [group]
    const participants = group.participants.filter(hit)
    const agents = group.agents.filter(hit)
    return participants.length + agents.length > 0 ? [{ ...group, participants, agents }] : []
  })
}

const ROW_BUTTON = 'flex w-full cursor-pointer items-center gap-2 rounded-md text-left hover:text-white'

function Row({ entity, color }: { entity: Entity; color: string }) {
  const select = useObservatory((s) => s.select)
  return (
    <li className="py-0.5">
      <button type="button" onClick={() => select(entity.id)} className={ROW_BUTTON}>
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{entity.name}</span>
      </button>
    </li>
  )
}

export function ListFallback({ model }: { model: NetworkModel }) {
  const [query, setQuery] = useState('')
  const select = useObservatory((s) => s.select)
  const groups = useMemo(() => groupsOf(model), [model])
  const shown = useMemo(() => narrow(groups, query), [groups, query])

  return (
    <GlassPanel
      data-testid="list-fallback"
      className="fixed inset-x-4 top-[150px] bottom-[220px] z-[5] mx-auto flex max-w-xl flex-col gap-3 p-4 text-[12.5px]"
    >
      <p className="text-scene-mut">3D view unavailable on this device. The same network, as a list:</p>
      <input
        type="search"
        aria-label="Filter by name"
        placeholder="Filter by name"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="rounded-[10px] border border-scene-line bg-transparent px-3 py-2 outline-none focus:border-[var(--accent)]"
      />
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {shown.length === 0 && <p className="text-scene-mut">Nothing matches “{query}”.</p>}
        {shown.map((group) => (
          <section key={group.key} className="border-b border-scene-line py-2 last:border-b-0">
            <h2 className="text-[13px] font-semibold">
              {group.ecosystem ? (
                <button type="button" onClick={() => select(group.ecosystem?.id ?? null)} className={ROW_BUTTON}>
                  {group.title}
                </button>
              ) : (
                group.title
              )}
            </h2>
            <ul>
              {group.participants.map((p) => (
                <Row key={p.id} entity={p} color={p.color} />
              ))}
              {group.agents.map((a) => (
                <Row key={a.id} entity={a} color={AGENT_COLORS.resolving} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </GlassPanel>
  )
}
