'use client'

import { Command } from 'cmdk'
import { useEffect, useMemo, useState } from 'react'
import type { Entity, EntityKind } from '@/domain/network-model'
import { agentColor } from '@/domain/roles'
import { isTyping } from '@/lib/is-typing'
import { type PaletteMode, useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import { searchEntities } from './search-entities'

const GROUPS: { kind: EntityKind; label: string }[] = [
  { kind: 'ecosystem', label: 'Ecosystems' },
  { kind: 'participant', label: 'Participants' },
  { kind: 'agent', label: 'Services' },
  { kind: 'corporation', label: 'Corporations' },
  { kind: 'schema', label: 'Schemas' },
  { kind: 'proposal', label: 'Proposals' },
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
  if (entity.kind === 'proposal') {
    const n = entity.id.slice('proposal:'.length)
    return n.startsWith('group-') ? `corporation proposal #${n.slice('group-'.length)}` : `chain proposal #${n}`
  }
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

const ROW_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] data-[selected=true]:bg-white/10'

const looksLikeDid = (query: string) => /^did:[a-z0-9]+:\S+$/i.test(query.trim())

function CheckDidRow({ did, onCheck }: { did: string; onCheck: (did: string) => void }) {
  return (
    <Command.Item value={`check:${did}`} onSelect={() => onCheck(did)} className={ROW_CLASS}>
      <span className="size-2 shrink-0 rounded-full bg-[var(--accent)]" />
      <span className="shrink-0 font-medium text-scene-txt">Is this service trustworthy?</span>
      <span className="ml-auto truncate font-mono text-[11px] text-scene-mut">{did}</span>
    </Command.Item>
  )
}

function ResultRow({ entity, onPick }: { entity: Entity; onPick: (id: Entity['id']) => void }) {
  const verdict = useObservatory((s) => (entity.kind === 'agent' ? s.agentVerdicts.get(entity.id) : undefined))
  return (
    <Command.Item value={entity.id} onSelect={() => onPick(entity.id)} className={ROW_CLASS}>
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: entity.kind === 'agent' ? agentColor(verdict) : entity.color }}
      />
      <span className="truncate font-medium text-scene-txt">{entity.name}</span>
      <span className="ml-auto max-w-[45%] shrink-0 truncate text-[11px] text-scene-mut">
        {KIND_LABEL[entity.kind]} {detailOf(entity)}
      </span>
    </Command.Item>
  )
}

const FOCUSABLE = 'input, button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

function trapTab(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') return
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)]
  if (items.length === 0) return
  event.preventDefault()
  const at = items.indexOf(document.activeElement as HTMLElement)
  const next = event.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : at === items.length - 1 ? 0 : at + 1
  items[next].focus()
}

const PLACEHOLDER: Record<Exclude<PaletteMode, 'closed'>, string> = {
  search: 'Search ecosystems, participants, services, corporations',
  check: 'Paste a DID, or search for a service to check',
}

function Palette({ mode, onClose }: { mode: Exclude<PaletteMode, 'closed'>; onClose: () => void }) {
  const model = useObservatory((s) => s.model)
  const select = useObservatory((s) => s.select)
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const found = model ? searchEntities(model, query) : []
    return mode === 'check' ? found.filter((entity) => entity.kind === 'agent') : found
  }, [model, query, mode])
  const did = looksLikeDid(query) ? query.trim() : null

  const check = (target: string) => {
    useObservatory.getState().requestTrustCheck(target)
    onClose()
  }

  const pick = (id: Entity['id']) => {
    const entity = model?.entities.get(id)
    if (mode === 'check' && entity?.did) return check(entity.did)
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
        aria-label={mode === 'check' ? 'Check a service' : 'Search'}
        aria-modal="true"
        onKeyDown={trapTab}
        className="fixed top-[68px] left-1/2 z-30 w-[560px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden text-scene-txt"
      >
        <Command shouldFilter={false} loop label="Search the network">
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={PLACEHOLDER[mode]}
            className="w-full border-b border-scene-line bg-transparent px-4 py-3 text-[13px] outline-none placeholder:text-scene-mut"
          />
          <Command.List className="max-h-[min(380px,60vh)] overflow-y-auto p-1.5">
            {did && <CheckDidRow did={did} onCheck={check} />}
            {query.trim() !== '' && results.length === 0 && !did && (
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
  const palette = useObservatory((s) => s.palette)
  const open = palette !== 'closed'
  const toggle = useMemo(
    () => () => {
      const state = useObservatory.getState()
      if (state.palette === 'closed') state.openPalette('search')
      else state.closePalette()
    },
    []
  )
  const close = useMemo(() => () => useObservatory.getState().closePalette(), [])
  useOpenShortcuts(toggle, close, open)

  return (
    <>
      <GlassPanel className="fixed top-[68px] left-1/2 z-10 -translate-x-1/2">
        <button
          type="button"
          onClick={() => useObservatory.getState().openPalette('search')}
          className="flex w-[300px] max-w-[calc(100vw-32px)] cursor-pointer items-center gap-2 px-3.5 py-2 text-left text-[12.5px] text-scene-mut hover:text-white"
        >
          <span>Search the network</span>
          <kbd className="ml-auto rounded border border-scene-line px-1.5 text-[11px]">/</kbd>
        </button>
      </GlassPanel>
      {palette !== 'closed' && <Palette key={palette} mode={palette} onClose={close} />}
    </>
  )
}
