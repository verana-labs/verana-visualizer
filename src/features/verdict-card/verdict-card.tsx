import type { EntityId } from '@/domain/network-model'
import { formatUtc } from '@/domain/trust-check'
import { TrustChain } from '@/features/trust-check/trust-chain'
import { VerdictSummary } from '@/features/trust-check/verdict-summary'
import type { NetworkConfig } from '@/lib/env'
import { formatSel } from '@/lib/view-state'
import { CopyButton } from '@/ui/copy-button'
import type { VerdictCardData } from './load-verdict'
import { PageActions } from './page-actions'

const KICKER = 'text-[10px] uppercase tracking-[.09em] text-scene-mut print:text-neutral-600'

interface VerdictCardProps {
  data: VerdictCardData
  cfg: NetworkConfig
  renderedAt: Date
}

export function VerdictCard({ data, cfg, renderedAt }: VerdictCardProps) {
  const { check } = data
  const agentId: EntityId = `agent:${check.did}`
  return (
    <main
      data-testid="verdict-card"
      className="mx-auto min-h-screen max-w-2xl bg-scene-bg px-4 py-8 text-scene-txt print:max-w-none print:bg-white print:p-0 print:text-black"
    >
      <nav data-chrome className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <a
          data-testid="back-to-scene"
          href={`/?sel=${formatSel(agentId)}`}
          className="rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] hover:border-[var(--accent)]"
        >
          ← Open in the observatory
        </a>
        <PageActions />
      </nav>

      <div className={KICKER}>
        Verana trust verdict · {cfg.chainId}
        {data.block !== null && ` · at block ${data.block.toLocaleString('en-US')}`}
      </div>
      <h1 className="mt-1 break-words text-2xl font-semibold tracking-[-.01em]">
        {data.subjectName ?? 'Service outside the loaded network'}
      </h1>
      <div className="mt-1 flex items-start justify-between gap-3">
        <p className="break-all font-mono text-[12px] text-scene-mut print:text-neutral-700">{check.did}</p>
        <span data-chrome className="shrink-0 print:hidden">
          <CopyButton label="Copy DID" text={check.did} />
        </span>
      </div>

      <div className="mt-6 rounded-[14px] border border-scene-line p-4 print:border-neutral-300">
        <VerdictSummary verdict={check.verdict} />
      </div>

      <div className="mt-6">
        {check.path.length > 0 ? (
          <TrustChain check={check} hops={data.hops} />
        ) : (
          <p className="text-[12.5px] text-scene-mut print:text-neutral-700">
            {data.networkError
              ? `The trust chain is unavailable: ${data.networkError}`
              : 'This DID is not in the network, so there is no trust chain.'}
          </p>
        )}
      </div>

      <section className="mt-6">
        <div className={KICKER}>Raw JSON</div>
        <pre
          data-testid="raw-json"
          className="mt-1.5 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-scene-line bg-black/30 p-3 font-mono text-[10.5px] print:border-neutral-300 print:bg-white"
        >
          {JSON.stringify(check, null, 2)}
        </pre>
      </section>

      <p className="mt-6 text-[11px] text-scene-mut print:text-neutral-600">
        Rendered {formatUtc(renderedAt.toISOString())} from {cfg.indexerUrl}
      </p>
    </main>
  )
}
