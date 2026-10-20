'use client'

import Image from 'next/image'
import { countedParticipants } from '@/features/inspector/entity-facts'
import type { NetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { GlassPanel } from '@/ui/glass-panel'
import { NetworkSwitch } from './network-switch'

const number = (n: number) => n.toLocaleString('en-US')

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[.09em] text-scene-mut">{label}</div>
      <div data-testid="figure" className="text-lg font-semibold tabular-nums">
        {value}
      </div>
    </div>
  )
}

export function Hud({ cfg }: { cfg: NetworkConfig }) {
  const model = useObservatory((s) => s.model)
  const blockHeight = useObservatory((s) => s.blockHeight)
  const verdicts = useObservatory((s) => s.agentVerdicts)

  const issued = model
    ? model.raw.participants.reduce(
        (sum, p) => (model.entities.has(`participant:${p.id}`) ? sum + Number(p.issued) : sum),
        0
      )
    : null
  const trusted = [...verdicts.values()].filter(Boolean).length

  return (
    <GlassPanel className="fixed left-4 top-4 z-10 flex flex-col gap-3 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Image src="/logo.svg" alt="Verana" width={20} height={20} />
            <span>{cfg.chainName}</span>
          </div>
          <div className="mt-[3px] flex items-center gap-1.5 text-[10px] uppercase tracking-[.09em] text-scene-mut">
            {blockHeight !== null && (
              <span
                data-testid="live-dot"
                className="inline-block size-[7px] rounded-full bg-success-500 shadow-[0_0_10px_theme(colors.success.500)]"
              />
            )}
            <span>block {blockHeight === null ? '…' : number(blockHeight)}</span>
          </div>
        </div>
        <NetworkSwitch cfg={cfg} />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <Figure label="ecosystems" value={model ? number(model.ecosystems.length) : '–'} />
        <Figure label="participants" value={model ? number(countedParticipants(model, model.participants)) : '–'} />
        <Figure label="credentials issued" value={issued === null ? '–' : number(issued)} />
        <Figure label="services" value={`${trusted} / ${verdicts.size}`} />
      </div>
    </GlassPanel>
  )
}
