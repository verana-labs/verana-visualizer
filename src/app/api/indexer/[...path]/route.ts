import { proxyIndexer } from '@/lib/api/indexer-proxy'
import { resolveNetworkConfig } from '@/lib/env'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  try {
    return await proxyIndexer(request, path, resolveNetworkConfig(process.env).indexerUrl)
  } catch (error) {
    logger.error(`Indexer proxy failed for /${path.join('/')}`, error)
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ error: `Indexer unreachable: ${message}` }, { status: 502 })
  }
}
