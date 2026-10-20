'use client'

import type { NetworkModel } from '@/domain/network-model'
import { isRole } from '@/domain/roles'
import { useBelowHud } from '@/features/economics-sim/economics-panel'
import { formatAmount, ROLE_LABELS } from '@/features/inspector/entity-facts'
import { Kicker } from '@/features/inspector/entity-parts'
import { ShowQuery } from '@/features/inspector/show-query'
import { WatchPanel } from '@/features/watch-panel/watch-panel'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import type { RegistryData } from './load-registry'
import { expiringSoon, onboardingColor, onboardingCounts, type PendingTask } from './registry-data'

export type RegistryState = { status: 'loading' } | { status: 'ready'; data: RegistryData }

interface RegistryPanelProps {
  model: NetworkModel
  now: Date
  state: RegistryState
}

const FOOTER_SPACE = 66

function Columns({ model, tasks }: { model: NetworkModel; tasks: readonly PendingTask[] | null }) {
  const counts = onboardingCounts(model.raw.participants, tasks)
  const max = Math.max(1, ...counts.map((c) => c.count))
  return (
    <ul aria-label="Onboarding states" className="mt-1.5 flex gap-1.5">
      {counts.map(({ state, count }) => (
        <li
          key={state}
          className="min-w-[76px] rounded-[10px] border border-scene-line px-2 py-1.5"
          style={{ flex: `${Math.max(1, Math.sqrt(count))} 1 0` }}
        >
          <span className="block truncate text-[9.5px] uppercase tracking-[.08em] text-scene-mut">{state}</span>
          <b className="block text-[15px] font-semibold tabular-nums" style={{ color: onboardingColor(state) }}>
            {formatAmount(count)}
          </b>
          <span aria-hidden="true" className="mt-1 block h-1 overflow-hidden rounded-full bg-white/5">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(count / max) * 100}%`, background: onboardingColor(state) }}
            />
          </span>
        </li>
      ))}
    </ul>
  )
}

function PendingList({ model, tasks }: { model: NetworkModel; tasks: readonly PendingTask[] }) {
  if (tasks.length === 0) return <p className="text-scene-mut">No onboarding request is waiting for a validator.</p>
  return (
    <ul aria-label="Pending tasks">
      {tasks.map((task) => {
        const name =
          model.entities.get(`participant:${task.participantId}`)?.name ?? `Participant ${task.participantId}`
        const schema = model.entities.get(`schema:${task.schemaId}`)?.name ?? `schema ${task.schemaId}`
        return (
          <li
            key={`${task.validatorCorporationId}:${task.participantId}`}
            className="border-b border-scene-line last:border-b-0"
          >
            <button
              type="button"
              onClick={() => useObservatory.getState().select(`participant:${task.participantId}`)}
              className="w-full cursor-pointer py-[5px] text-left hover:text-white"
            >
              <span className="block truncate">
                {`${name} #${task.participantId} · ${isRole(task.role) ? ROLE_LABELS[task.role] : task.role}`}
              </span>
              <span className="block truncate text-[11px] text-scene-mut">
                {`${schema} · awaiting corporation #${task.validatorCorporationId}`}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function Ready({ model, now, data }: { model: NetworkModel; now: Date; data: RegistryData }) {
  const { pending } = data
  return (
    <>
      <Columns model={model} tasks={pending.status === 'ready' ? pending.data : null} />
      <section className="mt-3">
        <Kicker>pending tasks · participant/pending/flat</Kicker>
        <div className="mt-1 text-[12px]">
          {pending.status === 'error' ? (
            <p role="alert" className="text-[#ff8a8a]">
              {`Pending tasks unavailable: ${pending.message}`}
            </p>
          ) : (
            <PendingList model={model} tasks={pending.data} />
          )}
        </div>
        {pending.status === 'ready' && pending.query && <ShowQuery query={pending.query} />}
      </section>
      <WatchPanel model={model} now={now} expiring={expiringSoon(model.raw.participants, now)} slashes={data.slashes} />
    </>
  )
}

export function RegistryPanel({ model, now, state }: RegistryPanelProps) {
  const top = useBelowHud()
  return (
    <GlassPanel
      role="complementary"
      aria-label="Registry"
      style={{ top, maxHeight: `calc(100vh - ${top + FOOTER_SPACE}px)` }}
      className="fixed left-4 z-10 w-[330px] max-w-[calc(100vw-32px)] overflow-y-auto p-4 text-scene-txt"
    >
      <Kicker>registry · live data</Kicker>
      <h2 className="mt-1 text-base font-semibold tracking-[-.01em]">Onboarding lifecycle</h2>
      <p className="text-[11.5px] text-scene-mut">
        Each participant’s onboarding state (op_state). The board in the scene stacks the same participants in one
        column per state, plus one for accreditations ending in the next 30 days.
      </p>
      {state.status === 'loading' ? (
        <>
          <Columns model={model} tasks={null} />
          <p className="mt-2 text-[12px] text-scene-mut">Reading pending tasks and slash history…</p>
        </>
      ) : (
        <Ready model={model} now={now} data={state.data} />
      )}
    </GlassPanel>
  )
}
