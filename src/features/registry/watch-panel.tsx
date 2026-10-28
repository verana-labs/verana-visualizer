'use client'

import { EXPIRY_WINDOW_DAYS } from '@/domain/expiry'
import type { NetworkModel } from '@/domain/network-model'
import { isRole } from '@/domain/roles'
import { formatAmount, ROLE_LABELS } from '@/features/inspector/entity-facts'
import { Kicker } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import type { Participant } from '@/lib/api/schemas'
import { vnaFromUvna } from '@/lib/format'
import { useObservatory } from '@/store/observatory-store'
import type { RegistrySection, SlashHistory } from './load-registry'

const DAY_MS = 86_400_000
const SLASH_RED = '#ff6b8b'
const EXPIRY_AMBER = '#fbbf24'

interface WatchPanelProps {
  model: NetworkModel
  now: Date
  expiring: readonly Participant[]
  slashes: RegistrySection<SlashHistory>
}

const plural = (n: number, word: string) => `${formatAmount(n)} ${word}${n === 1 ? '' : 'es'}`

function inDays(until: string, now: Date): string {
  const days = Math.ceil((Date.parse(until) - now.getTime()) / DAY_MS)
  return days <= 1 ? 'within a day' : `in ${days} days`
}

function Slashes({ slashes }: { slashes: RegistrySection<SlashHistory> }) {
  if (slashes.status === 'error')
    return (
      <p role="alert" className="text-[#ff8a8a]">
        {`Slash history unavailable: ${slashes.message}`}
      </p>
    )
  const { events, since } = slashes.data
  if (events.length === 0)
    return <p className="text-scene-mut">{since ? `No slashes recorded since ${since}` : 'No stats buckets yet.'}</p>
  return (
    <ul aria-label="Slash events">
      {events.map((event) => (
        <li key={event.day} className="flex justify-between gap-3 border-b border-scene-line py-[5px] last:border-b-0">
          <span className="truncate">
            {[
              event.ecosystemEvents > 0 && plural(event.ecosystemEvents, 'ecosystem slash'),
              event.networkEvents > 0 && plural(event.networkEvents, 'network slash'),
            ]
              .filter(Boolean)
              .join(' · ')}
            <span className="text-scene-mut">{` · ${event.day}`}</span>
          </span>
          <b className="shrink-0 font-medium tabular-nums" style={{ color: SLASH_RED }}>
            {`−${vnaFromUvna(event.amount)}`}
          </b>
        </li>
      ))}
    </ul>
  )
}

function Expirations({ model, now, expiring }: Omit<WatchPanelProps, 'slashes'>) {
  if (expiring.length === 0)
    return <p className="text-scene-mut">{`No accreditation expires in the next ${EXPIRY_WINDOW_DAYS} days`}</p>
  return (
    <ul aria-label="Upcoming expirations">
      {expiring.map((p) => {
        const name = model.entities.get(`participant:${p.id}`)?.name ?? `Participant ${p.id}`
        const schema = model.entities.get(`schema:${p.schema_id}`)?.name ?? `schema ${p.schema_id}`
        const until = p.effective_until ?? ''
        return (
          <li key={p.id} className="border-b border-scene-line last:border-b-0">
            <button
              type="button"
              onClick={() => useObservatory.getState().select(`participant:${p.id}`)}
              className="flex w-full cursor-pointer justify-between gap-3 py-[5px] text-left hover:text-white"
            >
              <span className="min-w-0">
                <span className="block truncate">{`${name} #${p.id}`}</span>
                <span className="block truncate text-[11px] text-scene-mut">
                  {`${isRole(p.role) ? ROLE_LABELS[p.role] : p.role} · ${schema}`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <b className="block font-medium" style={{ color: EXPIRY_AMBER }}>
                  {inDays(until, now)}
                </b>
                <span className="block text-[11px] text-scene-mut">{until.slice(0, 10)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function WatchPanel({ model, now, expiring, slashes }: WatchPanelProps) {
  return (
    <section aria-label="Watch list" className="mt-3">
      <Kicker>watch list</Kicker>
      <div className="mt-1.5 text-[10px] uppercase tracking-[.09em] text-scene-mut">
        {`expiring · next ${EXPIRY_WINDOW_DAYS} days`}
      </div>
      <div className="mt-0.5 text-[12px]">
        <Expirations model={model} now={now} expiring={expiring} />
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[.09em] text-scene-mut">slashes · indexer stats, daily</div>
      <div className="mt-0.5 text-[12px]">
        <Slashes slashes={slashes} />
      </div>
      {slashes.status === 'ready' && slashes.queries.map((query) => <ShowQuery key={query.url} query={query} />)}
    </section>
  )
}
