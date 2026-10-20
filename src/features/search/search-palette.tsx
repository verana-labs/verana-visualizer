'use client'

import { Command } from 'cmdk'
import { useEffect, useMemo, useState } from 'react'
import type { Entity, EntityKind } from '@/domain/network-model'
import { isTyping } from '@/lib/is-typing'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import { searchEntities } from './search-entities'

const GROUPS: { kind: EntityKind; label: string }[] = [
  { kind: 'ecosystem', label: 'Ecosystems' },
  { kind: 'participant', label: 'Participants' },
  { kind: 'agent', label: 'Services' },
  { kind: 'corporation', label: 'Corporations' },
  { kind: 'schema', label: 'Schemas' },
]

const KIND_LABEL: Record<EntityKind, string> = {
  ecosystem: 'Ecosystem',
  participant: 'Participant',
  agent: 'Service',
  corporation: 'Corporation',
  schema: 'Schema',
  proposal: 'Proposal',
}

function detailOf(entity: Entity): string {
  if (entity.kind === 'corporation' || entity.kind === 'schema' || entity.kind === 'participant')
    return `#${entity.id.slice(entity.id.indexOf(':') + 1)}`
  return entity.did ?? ''
}

function useOpenShortcuts(toggle: () => void, close: () => void, open: boolean) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        toggle()
        return
      }
      if (event.key === '/' && !open && !isTyping(event.target)) {
        event.preventDefault()
        toggle()
        return
      }
      if (event.key === 'Escape' && open) {
        event.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [toggle, close, open])
}

function ResultRow({ entity, onPick }: { entity: Entity; onPick: (id: Entity['id']) => void }) {
  return (
    <Command.Item
      value={entity.id}
      onSelect={() => onPick(entity.id)}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] data-[selected=true]:bg-white/10"
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: entity.color }} />
      <span className="truncate font-medium text-scene-txt">{entity.name}</span>
      <span className="ml-auto max-w-[45%] shrink-0 truncate text-[11px] text-scene-mut">
        {KIND_LABEL[entity.kind]} {detailOf(entity)}
      </span>
    </Command.Item>
  )
}

function Palette({ onClose }: { onClose: () => void }) {
  const model = useObservatory((s) => s.model)
  const select = useObservatory((s) => s.select)
  const [query, setQuery] = useState('')
  const results = useMemo(() => (model ? searchEntities(model, query) : []), [model, query])

  const pick = (id: Entity['id']) => {
    select(id)
    onClose()
  }

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close search"
        className="fixed inset-0 z-30 cursor-default"
        onClick={onClose}
      />
      <GlassPanel
        role="dialog"
        aria-label="Search"
        aria-modal="true"
        className="fixed top-[68px] left-1/2 z-30 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden text-scene-txt"
      >
        <Command shouldFilter={false} loop label="Search the network">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search ecosystems, participants, services, corporations"
            className="w-full border-b border-scene-line bg-transparent px-4 py-3 text-[13px] outline-none placeholder:text-scene-mut"
          />
          <Command.List className="max-h-[min(380px,60vh)] overflow-y-auto p-1.5">
            {query.trim() !== '' && results.length === 0 && (
              <p className="px-3 py-6 text-center text-[12.5px] text-scene-mut">Nothing matches “{query.trim()}”.</p>
            )}
            {GROUPS.map(({ kind, label }) => {
              const rows = results.filter((entity) => entity.kind === kind)
              return rows.length === 0 ? null : (
                <Command.Group
                  key={kind}
                  data-testid="search-group"
                  data-kind={kind}
                  heading={label}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[.09em] [&_[cmdk-group-heading]]:text-scene-mut"
                >
                  {rows.map((entity) => (
                    <ResultRow key={entity.id} entity={entity} onPick={pick} />
                  ))}
                </Command.Group>
              )
            })}
          </Command.List>
        </Command>
      </GlassPanel>
    </>
  )
}

export function SearchPalette() {
  const [open, setOpen] = useState(false)
  const toggle = useMemo(() => () => setOpen((value) => !value), [])
  const close = useMemo(() => () => setOpen(false), [])
  useOpenShortcuts(toggle, close, open)

  return (
    <>
      <GlassPanel className="fixed top-[68px] left-1/2 z-10 -translate-x-1/2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-[300px] max-w-[calc(100vw-32px)] cursor-pointer items-center gap-2 px-3.5 py-2 text-left text-[12.5px] text-scene-mut hover:text-white"
        >
          <span>Search the network</span>
          <kbd className="ml-auto rounded border border-scene-line px-1.5 text-[11px]">/</kbd>
        </button>
      </GlassPanel>
      {open && <Palette onClose={close} />}
    </>
  )
}
