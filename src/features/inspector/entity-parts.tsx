import type { ReactNode } from 'react'
import type { ParticipantState } from '@/domain/participant-state'
import { isRole, ROLES } from '@/domain/roles'
import { safeHttpUrl } from '@/lib/safe-url'
import { Chip } from '@/ui/chip'
import { ROLE_LABELS, STATE_COLORS } from './entity-facts'
import type { SpecLink } from './spec-links'

const tinted = (color: string, alpha: string) => ({ background: `${color}${alpha}`, color })

export function RoleChip({ role }: { role: string }) {
  if (!isRole(role)) return <Chip data-testid="role-chip">{role}</Chip>
  return (
    <Chip data-testid="role-chip" style={tinted(ROLES[role].color, '33')}>
      {ROLE_LABELS[role]}
    </Chip>
  )
}

export function StateChip({ state }: { state: ParticipantState }) {
  return (
    <Chip data-testid="state-chip" style={tinted(STATE_COLORS[state], '22')}>
      {state}
    </Chip>
  )
}

const VERDICTS = {
  trusted: { label: 'Trusted', color: '#29C68C' },
  untrusted: { label: 'Not trusted', color: '#ff8a8a' },
  resolving: { label: 'Not resolved yet', color: '#94a3b8' },
} as const

export function VerdictChip({ verdict }: { verdict: boolean | undefined }) {
  const v = verdict === undefined ? VERDICTS.resolving : verdict ? VERDICTS.trusted : VERDICTS.untrusted
  return (
    <Chip data-testid="verdict-chip" style={tinted(v.color, '22')}>
      {v.label}
    </Chip>
  )
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-scene-line py-[7px] text-[12.5px] last:border-b-0">
      <span className="text-scene-mut">{label}</span>
      <b data-testid="value" className="truncate text-right font-medium tabular-nums">
        {children}
      </b>
    </div>
  )
}

export function Kicker({ children, spec }: { children: ReactNode; spec?: SpecLink }) {
  if (!spec) return <div className="text-[10px] uppercase tracking-[.09em] text-scene-mut">{children}</div>
  return (
    <div className="flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-[.09em] text-scene-mut">
      <span className="min-w-0 truncate">{children}</span>
      <ExternalLink variant="inline" href={spec.href}>{`${spec.label} ↗`}</ExternalLink>
    </div>
  )
}

export function Mono({ children }: { children: ReactNode }) {
  return <div className="break-all font-mono text-[10.5px] text-scene-mut">{children}</div>
}

const LINK_CLASSES = {
  inline: 'shrink-0 normal-case tracking-normal underline-offset-2 hover:text-white hover:underline',
  row: 'flex justify-between gap-3 border-b border-scene-line py-[7px] text-[12.5px] last:border-b-0 hover:text-white',
  button:
    'flex items-center justify-between gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-3 py-2 text-xs font-medium hover:bg-[color-mix(in_srgb,var(--accent)_32%,transparent)]',
} as const

interface ExternalLinkProps {
  href: string | null | undefined
  variant?: keyof typeof LINK_CLASSES
  children: ReactNode
}

export function ExternalLink({ href, variant = 'button', children }: ExternalLinkProps) {
  const safe = safeHttpUrl(href)
  if (!safe) return null
  return (
    <a href={safe} target="_blank" rel="noreferrer" className={LINK_CLASSES[variant]}>
      {children}
    </a>
  )
}
