import { AGENT_COLORS } from '@/domain/roles'
import { formatUtc, isVerdictError, type TrustVerdictOutcome, verdictText } from '@/domain/trust-check'

const ERROR_COLOR = '#fbbf24'

function colorOf(verdict: TrustVerdictOutcome | null): string {
  if (!verdict) return AGENT_COLORS.resolving
  if (isVerdictError(verdict)) return ERROR_COLOR
  return verdict.trusted ? AGENT_COLORS.trusted : AGENT_COLORS.untrusted
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-scene-line py-[7px] text-[12.5px] last:border-b-0 print:border-neutral-300">
      <span className="text-scene-mut print:text-neutral-600">{label}</span>
      <b className="text-right font-medium tabular-nums">{children}</b>
    </div>
  )
}

export function VerdictSummary({ verdict }: { verdict: TrustVerdictOutcome | null }) {
  const value = verdict && !isVerdictError(verdict) ? verdict : null
  return (
    <section>
      <div
        data-testid="trust-verdict"
        className="text-2xl font-semibold tracking-[-.01em] print:!text-black"
        style={{ color: colorOf(verdict) }}
      >
        {verdict ? verdictText(verdict) : 'Resolving…'}
      </div>
      <p className="mt-0.5 text-[11px] text-scene-mut print:text-neutral-600">
        Verdict from the indexer (POST /v4/verifiable-trust/resolve), the only authority. Hop states are informational.
      </p>
      {value && (
        <div className="mt-2">
          <Row label="Evaluated at block">
            {value.evaluatedAtBlock === null ? 'not reported' : value.evaluatedAtBlock.toLocaleString('en-US')}
          </Row>
          <Row label="Evaluated at">{formatUtc(value.evaluatedAtTime) ?? 'not reported'}</Row>
          <Row label="Expires">{formatUtc(value.expiresAtTime) ?? 'no expiry reported'}</Row>
        </div>
      )}
    </section>
  )
}
