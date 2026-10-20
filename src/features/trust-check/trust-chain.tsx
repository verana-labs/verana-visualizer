import type { EntityId, NetworkModel } from '@/domain/network-model'
import { agentColor, isRole } from '@/domain/roles'
import { hopLabel, isVerdictError, type TrustCheck } from '@/domain/trust-check'
import { ROLE_LABELS } from '@/features/inspector/entity-facts'
import { CopyButton } from '@/ui/copy-button'

export interface HopInfo {
  name: string
  kind: string
  color: string
  did: string | null
}

function kindOf(id: EntityId, role: string | undefined): string {
  if (id.startsWith('agent:')) return 'service'
  if (id.startsWith('ecosystem:')) return 'ecosystem root'
  return role && isRole(role) ? ROLE_LABELS[role] : 'participant'
}

export function describePath(model: NetworkModel | null, check: TrustCheck): Record<string, HopInfo> {
  const verdict = isVerdictError(check.verdict) ? undefined : check.verdict.trusted
  return Object.fromEntries(
    check.path.map((id): [EntityId, HopInfo] => {
      const entity = model?.entities.get(id)
      const role = model?.raw.participants.find((p) => `participant:${p.id}` === id)?.role
      return [
        id,
        {
          name: entity?.name ?? id,
          kind: kindOf(id, role),
          color: id.startsWith('agent:') ? agentColor(verdict) : (entity?.color ?? '#94a3b8'),
          did: entity?.did ?? null,
        },
      ]
    })
  )
}

const SOURCE_LABEL: Record<TrustCheck['pathSource'], string> = {
  'verana-graph G1': 'Path from verana-graph G1',
  local: 'Path from the loaded network (local)',
}

interface TrustChainProps {
  check: TrustCheck
  hops: Record<string, HopInfo>
  copyClassName?: string
}

export function TrustChain({ check, hops, copyClassName = '' }: TrustChainProps) {
  const stateOf = new Map(check.hops.map((hop) => [hop.id, hop]))
  return (
    <section data-testid="trust-chain">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[.09em] text-scene-mut print:text-neutral-600">
          {SOURCE_LABEL[check.pathSource]}
        </div>
        {check.path.length > 0 && (
          <span data-chrome className={`print:hidden ${copyClassName}`}>
            <CopyButton label="Copy chain" text={check.path.join('\n')} />
          </span>
        )}
      </div>
      {check.pathError && (
        <p className="mt-1 text-[11px] text-scene-mut print:text-neutral-600">
          verana-graph G1 unavailable: {check.pathError}
        </p>
      )}
      <ol className="mt-1.5">
        {check.path.map((id: EntityId, index) => {
          const info = hops[id]
          const hop = stateOf.get(id)
          return (
            <li
              key={id}
              data-testid="chain-hop"
              data-id={id}
              className="flex gap-2.5 border-b border-scene-line py-[7px] text-[12.5px] last:border-b-0 print:border-neutral-300"
            >
              <span className="w-4 shrink-0 text-right tabular-nums text-scene-mut print:text-neutral-600">
                {index + 1}
              </span>
              <span
                className="mt-[5px] size-2 shrink-0 rounded-full print:border print:border-neutral-400"
                style={{ background: info?.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-medium">{info?.name ?? id}</span>
                  <span className="shrink-0 text-[10.5px] text-scene-mut print:text-neutral-600">{info?.kind}</span>
                </div>
                <div className="break-all font-mono text-[10.5px] text-scene-mut print:text-neutral-700">{id}</div>
                {hop && <div className="mt-0.5 text-[11px] text-scene-mut print:text-neutral-700">{hopLabel(hop)}</div>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
