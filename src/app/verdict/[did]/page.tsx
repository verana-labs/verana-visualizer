import type { Metadata } from 'next'
import { decodeDid, loadVerdict, parseBlock } from '@/features/verdict-card/load-verdict'
import { VerdictCard } from '@/features/verdict-card/verdict-card'
import { accentFor } from '@/lib/accent'
import { resolveNetworkConfig } from '@/lib/env'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Trust verdict · Verana Visualizer' }

interface VerdictPageProps {
  params: Promise<{ did: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function VerdictPage({ params, searchParams }: VerdictPageProps) {
  const [{ did: param }, search] = await Promise.all([params, searchParams])
  const cfg = resolveNetworkConfig(process.env)
  const data = await loadVerdict(cfg, decodeDid(param), parseBlock(search.block))
  return (
    <div style={{ '--accent': accentFor(cfg.chainName) } as React.CSSProperties}>
      <VerdictCard data={data} cfg={cfg} renderedAt={new Date()} />
    </div>
  )
}
