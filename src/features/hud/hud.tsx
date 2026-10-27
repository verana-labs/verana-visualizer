'use client'

import Image from 'next/image'
import { type ReactNode, useState } from 'react'
import { countedParticipants } from '@/features/inspector/entity-facts'
import { ViewActions } from '@/features/share/view-actions'
import { LiveTag } from '@/features/time-scrubber/live-tag'
import type { NetworkConfig } from '@/lib/env'
import { useObservatory } from '@/store/observatory-store'
import { Button } from '@/ui/button'
import { GlassPanel } from '@/ui/glass-panel'
import { GrowthLine, GrowthUnavailable, WhatChanged } from './growth'
import { NetworkSwitch } from './network-switch'

const number = (n: number) => n.toLocaleString('en-US')

function Figure({ label, value, growth }: { label: string; value: string; growth?: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[.09em] text-scene-mut">{label}</div>
      <div data-testid="figure" className="text-lg font-semibold tabular-nums">
        {value}
      </div>
      {growth}
    </div>
  )
}

export function Hud({ cfg, children }: { cfg: NetworkConfig; children?: ReactNode }) {
  const model = useObservatory((s) => s.model)
  const blockHeight = useObservatory((s) => s.blockHeight)
  const verdicts = useObservatory((s) => s.agentVerdicts)
  const [expanded, setExpanded] = useState(false)

  const issued = model
    ? model.raw.participants.reduce(
        (sum, p) => (model.entities.has(`participant:${p.id}`) ? sum + Number(p.issued) : sum),
        0
      )
    : null
  const trusted = [...verdicts.values()].filter(Boolean).length
  const services = model ? model.agents.length : 0
  const unresolved = model ? model.agents.filter((agent) => !verdicts.has(agent.id)).length : 0
  const ecosystems = model ? model.ecosystems.length : null
  const participants = model ? countedParticipants(model, model.participants) : null

  return (
    <GlassPanel
      data-testid="hud"
      className="fixed left-4 top-4 z-10 flex flex-col gap-3 px-4 py-3 max-md:right-4 max-md:top-[108px] max-md:py-2.5"
    >
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
        <div className="flex items-center gap-2">
          <NetworkSwitch cfg={cfg} />
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="hud-body"
            onClick={() => setExpanded((open) => !open)}
            className="cursor-pointer rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] text-scene-mut hover:text-white md:hidden"
          >
            Network figures <span aria-hidden="true">{expanded ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>
      <div id="hud-body" data-testid="hud-body" className={`flex flex-col gap-3 ${expanded ? '' : 'max-md:hidden'}`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <Figure
            label="ecosystems"
            value={ecosystems === null ? '–' : number(ecosystems)}
            growth={<GrowthLine metric="active_ecosystems" total={ecosystems} />}
          />
          <Figure
            label="participants"
            value={participants === null ? '–' : number(participants)}
            growth={<GrowthLine metric="participants" total={participants} />}
          />
          <Figure
            label="credentials issued"
            value={issued === null ? '–' : number(issued)}
            growth={<GrowthLine metric="issued" total={issued} />}
          />
          <Figure
            label="services"
            value={`${trusted} / ${services}`}
            growth={
              unresolved > 0 && (
                <div data-testid="services-pending" className="text-[10.5px] text-scene-mut">
                  {`${number(unresolved)} unresolved`}
                </div>
              )
            }
          />
        </div>
        <GrowthUnavailable />
        <WhatChanged />
        <LiveTag />
        <Button onClick={() => useObservatory.getState().openPalette('check')} className="text-[12.5px]">
          Is this service trustworthy?
        </Button>
        <ViewActions cfg={cfg} />
        {children}
      </div>
    </GlassPanel>
  )
}
