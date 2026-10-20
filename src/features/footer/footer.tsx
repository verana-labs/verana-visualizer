'use client'

import { faDiscord, faGithub, faLinkedin, faXTwitter, type IconDefinition } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { NetworkConfig } from '@/lib/env'
import { GlassPanel } from '@/ui/glass-panel'

const SOCIALS: { label: string; href: string; icon: IconDefinition }[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/verana-verifiable-trust-network', icon: faLinkedin },
  { label: 'X', href: 'https://x.com/Verana_io', icon: faXTwitter },
  { label: 'Discord', href: 'https://discord.gg/edjaFn252q', icon: faDiscord },
  { label: 'GitHub', href: 'https://github.com/verana-labs', icon: faGithub },
]

export function Footer({ cfg }: { cfg: NetworkConfig }) {
  const links = [
    { label: 'Documentation', href: 'https://docs.verana.io' },
    { label: 'Verana app', href: cfg.frontendUrl },
    { label: 'Verana Graph', href: `${cfg.graphUrl}/explorer` },
    { label: 'Indexer API', href: cfg.indexerUrl },
  ]
  return (
    <GlassPanel className="fixed inset-x-4 bottom-3 z-10 flex h-[42px] items-center justify-between rounded-xl pl-[18px] pr-2 text-xs max-md:justify-center max-md:px-2">
      <span className="font-semibold max-md:hidden">
        Verana Visualizer <span className="font-normal text-scene-mut">· {cfg.chainName}</span>
      </span>
      <nav aria-label="Verana links" className="flex gap-[22px] max-md:hidden">
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="text-scene-mut hover:text-white">
            {l.label}
          </a>
        ))}
      </nav>
      <div className="flex gap-1">
        {SOCIALS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={s.label}
            className="grid size-8 place-items-center rounded-[9px] text-scene-mut transition hover:-translate-y-px hover:bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] hover:text-white"
          >
            <FontAwesomeIcon icon={s.icon} className="size-[15px]" />
          </a>
        ))}
      </div>
    </GlassPanel>
  )
}
