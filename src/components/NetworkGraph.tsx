'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  fetchDIDList,
  fetchTrustRegistryList,
  fetchHeader,
  convertUvnaToVna
} from '@/lib/api'
import type { DID, TrustRegistry } from '@/types'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(async () => (await import('react-force-graph-2d')).default, { ssr: false }) as any

type NodeType = 'core' | 'controller' | 'trustRegistry' | 'didDirectory' | 'did'

interface GraphNode {
  id: string
  label: string
  type: NodeType
  ref?: any
  x?: number
  y?: number
  vx?: number
  vy?: number
}

interface GraphLink {
  source: string
  target: string
  type?: string
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

const NODE_COLOR: Record<NodeType, string> = {
  core: '#3B82F6',
  controller: '#10B981',
  trustRegistry: '#F59E0B',
  didDirectory: '#6B7280',
  did: '#8B5CF6'
}

function createId(prefix: string, value: string) {
  return `${prefix}:${value}`
}

async function loadGraphData(): Promise<GraphData> {
  const [didList, trList] = await Promise.all([
    fetchDIDList().catch(() => ({ dids: [] } as { dids: DID[] })),
    fetchTrustRegistryList(300).catch(() => ({ trust_registries: [] } as { trust_registries: TrustRegistry[] }))
  ])

  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeIds = new Set<string>()

  // Core
  nodes.push({ id: 'verana', label: 'Verana Network', type: 'core' })
  nodeIds.add('verana')

  // Build a map of controller -> { trs, dids }
  const controllerToTRs = new Map<string, TrustRegistry[]>()
  const controllerToDIDs = new Map<string, DID[]>()

  for (const tr of trList.trust_registries || []) {
    if (!tr.controller) continue
    const list = controllerToTRs.get(tr.controller) || []
    list.push(tr)
    controllerToTRs.set(tr.controller, list)
  }

  for (const d of didList.dids || []) {
    if (!d.controller) continue
    const list = controllerToDIDs.get(d.controller) || []
    list.push(d)
    controllerToDIDs.set(d.controller, list)
  }

  // Gather all controllers seen in either map
  const controllers = new Set<string>([
    ...Array.from(controllerToTRs.keys()),
    ...Array.from(controllerToDIDs.keys())
  ])

  // Add controllers and their connections
  for (const controller of Array.from(controllers)) {
    const ctrlNodeId = createId('ctrl', controller)
    if (!nodeIds.has(ctrlNodeId)) {
      nodes.push({ id: ctrlNodeId, label: controller, type: 'controller' })
      nodeIds.add(ctrlNodeId)
    }
    links.push({ source: ctrlNodeId, target: 'verana', type: 'participant' })

    // Trust Registries under this controller (connect directly to controller)
    const trs = controllerToTRs.get(controller) || []
    for (const tr of trs) {
      const trId = createId('tr', tr.id)
      if (!nodeIds.has(trId)) {
        nodes.push({ id: trId, label: `TR ${tr.id}`, type: 'trustRegistry', ref: tr })
        nodeIds.add(trId)
      }
      links.push({ source: ctrlNodeId, target: trId, type: 'owns-tr' })
    }

    // DID Directory hub
    const dids = controllerToDIDs.get(controller) || []
    if (dids.length > 0) {
      const dirId = createId('did-dir', controller)
      if (!nodeIds.has(dirId)) {
        nodes.push({ id: dirId, label: `DID Directory (${dids.length})`, type: 'didDirectory' })
        nodeIds.add(dirId)
      }
      links.push({ source: ctrlNodeId, target: dirId, type: 'has-did-dir' })
      for (const d of dids) {
        const didId = createId('did', d.did)
        if (!nodeIds.has(didId)) {
          nodes.push({ id: didId, label: d.did, type: 'did', ref: d })
          nodeIds.add(didId)
        }
        links.push({ source: dirId, target: didId, type: 'owns-did' })
      }
    }
  }

  return { nodes, links }
}

export default function NetworkGraph() {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastBlockHeight, setLastBlockHeight] = useState<string>('')
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null)
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })

  const refreshData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [header, graph] = await Promise.all([
        fetchHeader().catch(() => null),
        loadGraphData()
      ])
      if (header) {
        setLastBlockHeight(header.result.header.height)
      }
      setData(graph)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Poll every 30s; if block height changes, refresh graph
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const header = await fetchHeader()
        if (header.result.header.height !== lastBlockHeight) {
          setLastBlockHeight(header.result.header.height)
          const graph = await loadGraphData()
          setData(graph)
        }
      } catch {
        // ignore transient errors
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [lastBlockHeight])

  // Measure container and update graph dimensions
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setContainerSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) })
    }
    update()
    const ResizeObserverCtor = (window as any).ResizeObserver
    const ro = ResizeObserverCtor ? new ResizeObserverCtor((entries: any[]) => {
      for (const entry of entries) {
        const cr = entry.contentRect
        setContainerSize({ width: Math.floor(cr.width), height: Math.floor(cr.height) })
      }
    }) : null
    if (ro) ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      if (ro) ro.disconnect()
    }
  }, [])

  const nodeColor = useCallback((node: GraphNode) => NODE_COLOR[node.type], [])

  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const x = node.x || 0
    const y = node.y || 0
    const label = node.label
    const fontSize = 12 / (globalScale ** 0.5)
    const radius = node.type === 'core' ? 20 : node.type === 'controller' ? 9 : 6

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
    ctx.fillStyle = nodeColor(node)
    ctx.fill()

    if (hoverNodeId === node.id) {
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#9CA3AF'
      ctx.fillText(label, x + radius + 4, y)
    }
  }, [nodeColor, hoverNodeId])

  const onNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    if (graphRef.current) {
      const distance = 80
      const distRatio = 1 + distance / Math.hypot(node['x'] || 0, node['y'] || 0)
      graphRef.current.centerAt(node['x'] || 0, node['y'] || 0, 600)
      graphRef.current.zoom((graphRef.current.zoom() || 1) * distRatio, 600)
    }
  }, [])

  const fitToGraph = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(600, 40)
    }
  }, [])

  const memoData = useMemo(() => data, [data])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 bg-white dark:bg-dark-card rounded-lg shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Block</span>
            <span className="font-mono text-gray-900 dark:text-white">{lastBlockHeight || '...'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={fitToGraph} className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">Fit</button>
            <button onClick={refreshData} disabled={refreshing} className="px-3 py-1.5 text-sm rounded bg-verana-accent text-white hover:bg-opacity-90 disabled:opacity-50">{refreshing ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        <div ref={containerRef} className="h-[70vh] relative overflow-hidden">
          {!loading && (
            <ForceGraph2D
              ref={graphRef}
              graphData={memoData}
              nodeId="id"
              linkSource="source"
              linkTarget="target"
              width={containerSize.width}
              height={containerSize.height}
              nodeCanvasObject={nodeCanvasObject}
              nodePointerAreaPaint={(node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
                const x = node.x || 0
                const y = node.y || 0
                const radius = node.type === 'core' ? 24 : node.type === 'controller' ? 12 : 10
                ctx.beginPath()
                ctx.arc(x, y, radius, 0, 2 * Math.PI, false)
                ctx.fillStyle = color
                ctx.fill()
              }}
              onNodeHover={(node: GraphNode | null) => setHoverNodeId(node ? node.id : null)}
              linkColor={(link: GraphLink) => link.type === 'controls' ? '#F472B6' : '#94A3B8'}
              linkDirectionalArrowLength={3}
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.004}
              warmupTicks={60}
              cooldownTime={15000}
              onNodeClick={onNodeClick}
            />
          )}
          {loading && (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Loading graph...</div>
          )}
        </div>
      </div>

      <div className="lg:col-span-1 bg-white dark:bg-dark-card rounded-lg shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Details</h3>
        {!selectedNode && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Click a node to see details.</p>
        )}
        {selectedNode && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Label</p>
              <p className="font-mono text-gray-900 dark:text-white break-all">{selectedNode.label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: NODE_COLOR[selectedNode.type] + '22', color: NODE_COLOR[selectedNode.type] }}>
                {selectedNode.type}
              </span>
            </div>

            {/* Trust Registry details */}
            {selectedNode.type === 'trustRegistry' && selectedNode.ref && (
              <div className="space-y-2">
                <InfoRow label="DID" value={selectedNode.ref.did} mono />
                <InfoRow label="Controller" value={selectedNode.ref.controller} mono />
                <InfoRow label="Deposit" value={`${convertUvnaToVna(selectedNode.ref.deposit)} VNA`} />
                <InfoRow label="Language" value={selectedNode.ref.language} />
                <InfoRow label="Created" value={formatDateTime(selectedNode.ref.created)} />
                <InfoRow label="Modified" value={formatDateTime(selectedNode.ref.modified)} />
                {selectedNode.ref.aka && (
                  <InfoRow label="Website" value={selectedNode.ref.aka} link />
                )}
                <InfoRow label="Active Version" value={`v${selectedNode.ref.active_version}`} />
                {Array.isArray(selectedNode.ref.versions) && selectedNode.ref.versions.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Versions</p>
                    <div className="text-xs bg-gray-50 dark:bg-dark-surface rounded p-2 max-h-40 overflow-auto">
                      {selectedNode.ref.versions.map((v: any) => (
                        <div key={v.id} className="py-1 border-b last:border-b-0 border-gray-200 dark:border-dark-border">
                          <div className="flex justify-between"><span>Version</span><span className="font-mono">{v.version}</span></div>
                          <div className="flex justify-between"><span>Created</span><span className="font-mono">{formatDateTime(v.created)}</span></div>
                          {Array.isArray(v.documents) && v.documents.length > 0 && (
                            <div className="mt-1">
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">Documents</p>
                              {v.documents.map((doc: any) => (
                                <div key={doc.id} className="truncate">
                                  <a className="text-blue-600 dark:text-blue-400 underline" href={doc.url} target="_blank" rel="noreferrer">{doc.url}</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DID details */}
            {selectedNode.type === 'did' && selectedNode.ref && (
              <div className="space-y-2">
                <InfoRow label="DID" value={selectedNode.ref.did} mono />
                <InfoRow label="Controller" value={selectedNode.ref.controller} mono />
                <InfoRow label="Deposit" value={`${convertUvnaToVna(selectedNode.ref.deposit)} VNA`} />
                <InfoRow label="Status" value={computeDidStatus(selectedNode.ref.exp)} />
                <InfoRow label="Created" value={formatDateTime(selectedNode.ref.created)} />
                <InfoRow label="Modified" value={formatDateTime(selectedNode.ref.modified)} />
                <InfoRow label="Expires" value={formatDateTime(selectedNode.ref.exp)} />
              </div>
            )}

            {/* Controller info */}
            {selectedNode.type === 'controller' && (
              <div className="space-y-2">
                <InfoRow label="Address" value={selectedNode.label} mono />
                <p className="text-xs text-gray-500 dark:text-gray-400">Connected Trust Registries and DID Directory shown in graph.</p>
              </div>
            )}

            {/* DID Directory info */}
            {selectedNode.type === 'didDirectory' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Contains all DIDs controlled by the controller.</p>
              </div>
            )}

            <div className="pt-2">
              <button
                className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                onClick={() => setSelectedNode(null)}
              >
                Clear
              </button>
            </div>
          </div>
        )}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Legend</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.core }} /> <span>Verana</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.controller }} /> <span>Controller</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.trustRegistry }} /> <span>Trust Registry</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.didDirectory }} /> <span>DID Directory</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.did }} /> <span>DID</span></li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono = false, link = false }: { label: string; value: string; mono?: boolean; link?: boolean }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className={`underline ${mono ? 'font-mono' : ''} text-blue-600 dark:text-blue-400 break-all`}>{value}</a>
      ) : (
        <p className={`${mono ? 'font-mono' : ''} text-gray-900 dark:text-white break-all`}>{value}</p>
      )}
    </div>
  )
}

function formatDateTime(dateString?: string) {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

function computeDidStatus(exp?: string) {
  if (!exp) return 'Unknown'
  try {
    const now = Date.now()
    const expMs = new Date(exp).getTime()
    return expMs > now ? 'Active' : 'Expired'
  } catch {
    return 'Unknown'
  }
}


