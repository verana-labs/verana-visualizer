'use client'

import { AGENT_COLORS, ECOSYSTEM_STAR_COLOR, ROLES, type Role } from '@/domain/roles'
import { useObservatory } from '@/store/observatory-store'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'

const ROLE_LABELS: Record<Role, string> = {
  ECOSYSTEM: 'Ecosystem participant',
  ISSUER_GRANTOR: 'Issuer grantor',
  VERIFIER_GRANTOR: 'Verifier grantor',
  ISSUER: 'Issuer',
  VERIFIER: 'Verifier',
  HOLDER: 'Holder',
}

function Row({ dotClass, color, label }: { dotClass?: string; color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className={`size-[9px] ${dotClass ?? 'rounded-full'}`} style={{ background: color }} />
      {label}
    </div>
  )
}

export function Legend() {
  const hidden = useObservatory((s) => s.lens === 'economics' || s.lens === 'chain')
  if (hidden) return null
  return (
    <GlassPanel className="fixed bottom-[66px] left-4 z-10 px-3.5 py-3 text-[11.5px]">
      <Row color={ECOSYSTEM_STAR_COLOR} label="Ecosystem (trust root)" />
      {(Object.keys(ROLES) as Role[]).map((role) => (
        <Row key={role} color={ROLES[role].color} label={ROLE_LABELS[role]} />
      ))}
      <Row
        dotClass="rotate-45 scale-[.85] rounded-[2px]"
        color={AGENT_COLORS.trusted}
        label="Verifiable service (agent)"
      />
      <Row dotClass="rounded-full border border-[#c4b5fd]" color="transparent" label="Chain core · comets = live tx" />
      <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-scene-mut">
        tilted orbit = one credential schema
      </div>
      <Button disabled className="mt-2.5">
        ▶ 30-second tour
      </Button>
    </GlassPanel>
  )
}
