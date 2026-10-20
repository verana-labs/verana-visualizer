export const ROLES = {
  ECOSYSTEM: { color: '#a855f7', tier: 0 },
  ISSUER_GRANTOR: { color: '#3b82f6', tier: 1 },
  VERIFIER_GRANTOR: { color: '#64748b', tier: 1 },
  ISSUER: { color: '#22c55e', tier: 2 },
  VERIFIER: { color: '#f97316', tier: 2 },
  HOLDER: { color: '#ec4899', tier: 3 },
} as const

export type Role = keyof typeof ROLES

export const ECOSYSTEM_STAR_COLOR = '#d8cbff'

export const AGENT_COLORS = { trusted: '#38E1FF', untrusted: '#ff6b8b', resolving: '#7dd3fc' } as const

export function isRole(value: string): value is Role {
  return Object.hasOwn(ROLES, value)
}

export function agentColor(verdict: boolean | undefined): string {
  if (verdict === undefined) return AGENT_COLORS.resolving
  return verdict ? AGENT_COLORS.trusted : AGENT_COLORS.untrusted
}
