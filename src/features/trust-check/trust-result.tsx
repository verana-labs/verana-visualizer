'use client'

import { useMemo } from 'react'
import { isVerdictError, verdictPath } from '@/domain/trust-check'
import { useObservatory } from '@/store/observatory-store'
import { CopyButton } from '@/ui/copy-button'
import { describePath, TrustChain } from './trust-chain'
import { VerdictSummary } from './verdict-summary'

export function TrustResult() {
  const trustCheck = useObservatory((s) => s.trustCheck)
  const model = useObservatory((s) => s.model)
  const result = trustCheck?.result ?? null
  const hops = useMemo(() => (result ? describePath(model, result) : {}), [model, result])
  if (!trustCheck) return null

  const subject = trustCheck.subject ? model?.entities.get(trustCheck.subject) : undefined
  const block = result && !isVerdictError(result.verdict) ? result.verdict.evaluatedAtBlock : null
  const cardPath = verdictPath(trustCheck.did, block)

  return (
    <div data-testid="trust-result">
      <div className="text-[10px] uppercase tracking-[.09em] text-scene-mut">Is this service trustworthy?</div>
      <h2 className="mt-1 mb-0.5 break-words text-lg font-semibold tracking-[-.01em]">
        {subject?.name ?? 'Service outside the loaded network'}
      </h2>
      <div className="mb-3 break-all font-mono text-[10.5px] text-scene-mut">{trustCheck.did}</div>
      <VerdictSummary verdict={result?.verdict ?? null} />
      {result && (
        <>
          <div className="mt-3.5">
            {result.path.length > 0 ? (
              <TrustChain check={result} hops={hops} />
            ) : (
              <p className="text-[12.5px] text-scene-mut">
                This DID is not in the loaded network, so there is no trust chain to trace.
              </p>
            )}
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <CopyButton label="Copy verdict link" text={() => `${window.location.origin}${cardPath}`} />
            <a
              href={cardPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] hover:border-[var(--accent)]"
            >
              Open verdict card ↗
            </a>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[.09em] text-scene-mut hover:text-white">
              Raw JSON
            </summary>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-scene-line bg-black/30 p-2 font-mono text-[10.5px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
