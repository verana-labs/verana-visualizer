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
    return Response.json(
      { error: 'The indexer proxy is unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }
    )
  }
}
