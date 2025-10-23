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

// Import the wrapper component
import ForceGraph3DWrapper from './ForceGraph3DWrapper'

type NodeType = 'core' | 'controller' | 'trustRegistry' | 'didDirectory' | 'did'

interface GraphNode {
  id: string
  label: string
  type: NodeType
  ref?: any
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
  val?: number // Node size
}

interface GraphLink {
  source: string
  target: string
  type?: string
  curvature?: number
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

// Node size multipliers
const NODE_SIZE: Record<NodeType, number> = {
  core: 5,
  controller: 3,
  trustRegistry: 2,
  didDirectory: 1.5,
  did: 1
}

// Function to create text textures for node labels
function createTextTexture(text: string, color: string) {
  // Create a canvas texture for text
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;
  
  canvas.width = 256;
  canvas.height = 64;
  
  // Draw background (semi-transparent)
  context.fillStyle = '#00000080';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  context.font = '24px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(text.length > 20 ? text.substring(0, 20) + '...' : text, canvas.width / 2, canvas.height / 2);
  
  // Create texture
  const texture = new (window as any).THREE.Texture(canvas);
  texture.needsUpdate = true;
  return texture;
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

  // Add core node
  nodes.push({ 
    id: 'verana', 
    label: 'Verana Network', 
    type: 'core',
    val: NODE_SIZE.core * 2 // Make core node larger
  })
  nodeIds.add('verana')
  
  const controllerToTRs = new Map<string, TrustRegistry[]>()
  const controllerToDIDs = new Map<string, DID[]>()

  // Process trust registries
  for (const tr of trList.trust_registries || []) {
    if (!tr.controller) continue
    const list = controllerToTRs.get(tr.controller) || []
    list.push(tr)
    controllerToTRs.set(tr.controller, list)
  }

  // Process DIDs
  for (const d of didList.dids || []) {
    if (!d.controller) continue
    const list = controllerToDIDs.get(d.controller) || []
    list.push(d)
    controllerToDIDs.set(d.controller, list)
  }

  const controllers = new Set<string>([
    ...Array.from(controllerToTRs.keys()),
    ...Array.from(controllerToDIDs.keys())
  ])

  // Calculate importance metrics
  const controllerImportance = new Map<string, number>()
  
  // Build the graph structure
  for (const controller of Array.from(controllers)) {
    const trs = controllerToTRs.get(controller) || []
    const dids = controllerToDIDs.get(controller) || []
    
    // Calculate controller importance based on number of trust registries and DIDs
    const trScore = trs.length * 2 // Weight TRs more heavily
    const didScore = dids.length
    const importance = Math.sqrt(trScore + didScore) // Use sqrt to prevent extreme size differences
    controllerImportance.set(controller, importance)
    
    const ctrlNodeId = createId('ctrl', controller)
    if (!nodeIds.has(ctrlNodeId)) {
      nodes.push({ 
        id: ctrlNodeId, 
        label: controller, 
        type: 'controller',
        // Size controller nodes based on their importance
        val: NODE_SIZE.controller * (1 + Math.min(importance / 3, 2))
      })
      nodeIds.add(ctrlNodeId)
    }
    
    // Connect controller to core
    links.push({ 
      source: ctrlNodeId, 
      target: 'verana', 
      type: 'participant',
      curvature: 0.1 // Slight curve for better visualization
    })
    
    // Add trust registries
    for (const tr of trs) {
      const trId = createId('tr', tr.id)
      
      // Calculate trust registry importance based on deposit amount
      const depositAmount = parseInt(tr.deposit, 10) || 0
      const depositScore = Math.log10(depositAmount + 1) / 10 // Logarithmic scaling
      
      if (!nodeIds.has(trId)) {
        nodes.push({ 
          id: trId, 
          label: `TR ${tr.id}`, 
          type: 'trustRegistry', 
          ref: tr,
          // Size trust registry nodes based on deposit amount
          val: NODE_SIZE.trustRegistry * (1 + depositScore)
        })
        nodeIds.add(trId)
      }
      links.push({ 
        source: ctrlNodeId, 
        target: trId, 
        type: 'owns-tr',
        curvature: 0.2
      })
    }

    // Add DIDs
    if (dids.length > 0) {
      const dirId = createId('did-dir', controller)
      if (!nodeIds.has(dirId)) {
        nodes.push({ 
          id: dirId, 
          label: `DID Directory (${dids.length})`, 
          type: 'didDirectory',
          // Size DID directory nodes based on number of DIDs
          val: NODE_SIZE.didDirectory * (1 + Math.min(Math.log10(dids.length) / 2, 1))
        })
        nodeIds.add(dirId)
      }
      links.push({ 
        source: ctrlNodeId, 
        target: dirId, 
        type: 'has-did-dir',
        curvature: 0.1
      })
      
      // Add individual DIDs
      for (const d of dids) {
        const didId = createId('did', d.did)
        
        // Calculate DID importance based on deposit
        const depositAmount = parseInt(d.deposit, 10) || 0
        const depositScore = Math.log10(depositAmount + 1) / 20 // Logarithmic scaling, smaller effect
        
        if (!nodeIds.has(didId)) {
          nodes.push({ 
            id: didId, 
            label: d.did, 
            type: 'did', 
            ref: d,
            // Size DID nodes based on deposit amount
            val: NODE_SIZE.did * (1 + depositScore)
          })
          nodeIds.add(didId)
        }
        links.push({ 
          source: dirId, 
          target: didId, 
          type: 'owns-did',
          curvature: 0.05
        })
      }
    }
  }

  return { nodes, links }
}

export default function NetworkGraph3D() {
  const graphRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [lastBlockHeight, setLastBlockHeight] = useState<string>('')
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set())
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [pulseAnimation, setPulseAnimation] = useState<boolean>(false)
  const pulseRef = useRef<any>(null)
  const [showHelp, setShowHelp] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

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

  // Poll for updates
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
        // Handle error silently
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [lastBlockHeight])

  // Handle container size updates
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

  // Create pulse animation effect
  useEffect(() => {
    if (pulseAnimation && selectedNode) {
      // Start pulse animation
      let intensity = 0;
      let increasing = true;
      
      pulseRef.current = setInterval(() => {
        if (increasing) {
          intensity += 0.1;
          if (intensity >= 1) {
            intensity = 1;
            increasing = false;
          }
        } else {
          intensity -= 0.1;
          if (intensity <= 0.3) {
            intensity = 0.3;
            increasing = true;
          }
        }
        
        // Update particles on links connected to selected node
        if (graphRef.current) {
          graphRef.current.linkDirectionalParticleWidth(() => intensity * 3);
          graphRef.current.linkDirectionalParticles((link: any) => {
            const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
            const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
            const linkId = `${sourceId}-${targetId}`;
            return highlightLinks.has(linkId) ? Math.round(3 + intensity * 5) : 0;
          });
        }
      }, 50);
      
      return () => {
        if (pulseRef.current) clearInterval(pulseRef.current);
      };
    }
  }, [pulseAnimation, selectedNode, highlightLinks]);

  // Handle node click - zoom to node with animation
  const onNodeClick = useCallback((node: GraphNode) => {
    // Clear previous animation
    if (pulseRef.current) clearInterval(pulseRef.current);
    setPulseAnimation(false);
    
    // If clicking the same node, deselect it
    if (selectedNode && selectedNode.id === node.id) {
      setSelectedNode(null);
      setHighlightLinks(new Set());
      
      // Return to overview
      if (graphRef.current) {
        graphRef.current.zoomToFit(1000);
      }
      return;
    }
    
    setSelectedNode(node);
    
    if (graphRef.current) {
      // Find all links connected to this node
        const links = data.links.filter(
        link => {
          const source = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
          const target = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
          return source === node.id || target === node.id;
        }
      );
      
      // Create a set of highlighted link IDs
      setHighlightLinks(new Set(links.map(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
        const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
        return `${sourceId}-${targetId}`;
      })));
      
      // Calculate distance based on node type
      const distance = node.type === 'core' ? 100 : 
                     node.type === 'controller' ? 50 : 30;
      
      // Safe extraction of coordinates with defaults
      const nodeX = node.x || 0;
      const nodeY = node.y || 0;
      const nodeZ = node.z || 0;
      
      // Animate camera to focus on the selected node
      graphRef.current.cameraPosition(
        { x: nodeX, y: nodeY, z: nodeZ + distance }, // Position slightly away from the node
        { x: nodeX, y: nodeY, z: nodeZ }, // Look at node
        1000 // Transition duration in ms
      );
      
      // Start pulse animation after camera movement
      setTimeout(() => {
        setPulseAnimation(true);
      }, 1000);
    }
  }, [data.links, selectedNode]);

  // Configure graph physics for better performance
  const configureForces = useCallback(() => {
    if (!graphRef.current) return;
    
    // Adjust link force for better node spacing
    graphRef.current.d3Force('link')
      .distance((link: any) => {
        const source = typeof link.source === 'object' ? link.source : { type: 'unknown' };
        const target = typeof link.target === 'object' ? link.target : { type: 'unknown' };
        
        // Adjust distances based on node types
        if (source.type === 'core' || target.type === 'core') {
          return 100; // More space around core
        } else if (source.type === 'controller' || target.type === 'controller') {
          return 60;  // Medium space around controllers
        } else {
          return 30;  // Default distance for other links
        }
      });
    
    // Custom charge force for better node distribution
    graphRef.current.d3Force('charge')
      .strength((node: any) => {
        if (!node) return -50;
        // Adjust repulsion based on node type
        switch(node.type) {
          case 'core': return -200;
          case 'controller': return -120;
          case 'trustRegistry': return -80;
          case 'didDirectory': return -60;
          case 'did': return -30;
          default: return -50;
        }
      })
      .distanceMax(300); // Limit the maximum distance of effect
    
    // Note: Collision force is handled by the charge force configuration above
    // The 3d-force-graph library manages D3 internally and doesn't expose it on window
    // The charge force with appropriate strengths will prevent node overlap
  }, []);
  
  // Apply force configuration after data loads
  useEffect(() => {
    if (data.nodes.length > 0 && graphRef.current) {
      configureForces();
    }
  }, [data.nodes, configureForces]);
  
  // Fit graph to view
  const fitToGraph = useCallback(() => {
    if (graphRef.current) {
      try {
        // Check if zoomToFit method exists
        if (typeof graphRef.current.zoomToFit === 'function') {
          // Use zoomToFit with proper parameters
          // First parameter: transition duration in ms
          // Second parameter: padding in pixels
          graphRef.current.zoomToFit(1000, 50);
        } else {
          // Alternative: reset camera to a good overview position
          graphRef.current.cameraPosition({ x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 1000);
        }
        
        // Also reset any selected node and animations
        setSelectedNode(null);
        setHighlightLinks(new Set());
        if (pulseRef.current) {
          clearInterval(pulseRef.current);
          setPulseAnimation(false);
        }
      } catch (error) {
        console.warn('Error fitting graph to view:', error);
        // Fallback: try to reset camera position
        try {
          graphRef.current.cameraPosition({ x: 0, y: 0, z: 200 }, { x: 0, y: 0, z: 0 }, 1000);
        } catch (fallbackError) {
          console.warn('Fallback camera reset also failed:', fallbackError);
        }
      }
    }
  }, [])

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  // Handle keyboard shortcuts for fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F11') {
        event.preventDefault()
        toggleFullscreen()
      } else if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault()
        setIsFullscreen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen, isFullscreen])

  // Memoize data to prevent unnecessary re-renders
  const memoData = useMemo(() => data, [data])

  return (
    <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-1' : 'lg:grid-cols-4'} gap-6`}>
      <div className={`${isFullscreen ? 'lg:col-span-1' : 'lg:col-span-3'} bg-white dark:bg-dark-card rounded-lg shadow-lg`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Block</span>
            <span className="font-mono text-gray-900 dark:text-white">{lastBlockHeight || '...'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={fitToGraph} 
              className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center"
              title="Fit all nodes in view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              Fit All
            </button>
            <button 
              onClick={() => {
                if (graphRef.current) {
                  // Toggle between default (orbit) and fly control type
                  const currentType = graphRef.current.controlType();
                  graphRef.current.controlType(currentType === 'orbit' ? 'fly' : 'orbit');
                }
              }}
              className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Toggle Controls
            </button>
            <button onClick={refreshData} disabled={refreshing} className="px-3 py-1.5 text-sm rounded bg-verana-accent text-white hover:bg-opacity-90 disabled:opacity-50 flex items-center">
              {refreshing ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9v4.5M15 9h4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15v-4.5M15 15h4.5M15 15l5.5 5.5" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
              {isFullscreen ? "Exit" : "Fullscreen"}
            </button>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help
            </button>
          </div>
        </div>

        <div ref={containerRef} className={`${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[70vh]'} relative overflow-hidden`}>
          {/* Help Overlay */}
          {showHelp && (
            <div className="absolute inset-0 bg-black/70 z-10 flex items-center justify-center">
              <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">3D Network Graph Controls</h3>
                  <button 
                    onClick={() => setShowHelp(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Basic Navigation</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Left-click + drag</strong>: Rotate camera</li>
                      <li><strong>Right-click + drag</strong>: Pan camera</li>
                      <li><strong>Scroll</strong>: Zoom in/out</li>
                      <li><strong>Click node</strong>: Select and focus on node</li>
                      <li><strong>Click background</strong>: Deselect</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Fullscreen Mode</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>Fullscreen button</strong>: Toggle fullscreen mode</li>
                      <li><strong>F11 key</strong>: Toggle fullscreen</li>
                      <li><strong>Escape key</strong>: Exit fullscreen</li>
                      <li><strong>Fullscreen</strong>: Graph takes full screen space</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Color Legend</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: NODE_COLOR.core }}></span> <strong>Blue</strong>: Verana Core</li>
                      <li><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: NODE_COLOR.controller }}></span> <strong>Green</strong>: Controller</li>
                      <li><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: NODE_COLOR.trustRegistry }}></span> <strong>Orange</strong>: Trust Registry</li>
                      <li><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: NODE_COLOR.didDirectory }}></span> <strong>Gray</strong>: DID Directory</li>
                      <li><span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: NODE_COLOR.did }}></span> <strong>Purple</strong>: DID</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && containerSize.width > 0 && (
            <ForceGraph3DWrapper
              ref={graphRef}
              graphData={memoData}
              nodeId="id"
              linkSource="source"
              linkTarget="target"
              width={containerSize.width}
              height={containerSize.height}
              backgroundColor="#000011"
              // Use a calculated nodeVal for dynamic sizing
              nodeVal={(node: GraphNode) => node.val || 1}
              nodeColor={(node: GraphNode) => NODE_COLOR[node.type]}
              nodeOpacity={0.9}
              nodeResolution={8}
              linkCurvature="curvature"
              linkColor={(link: GraphLink) => {
                // Highlight links when a node is selected
                if (!selectedNode) return '#94A3B866';
                
                // Safely handle source/target which might be string or object
                const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
                const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
                const linkId = `${sourceId}-${targetId}`;
                
                return highlightLinks.has(linkId) ? '#F472B6' : '#94A3B844';
              }}
              linkOpacity={0.3}
              linkWidth={(link: GraphLink) => {
                // Make highlighted links thicker
                if (!selectedNode) return 1;
                
                // Safely handle source/target which might be string or object
                const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
                const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
                const linkId = `${sourceId}-${targetId}`;
                
                return highlightLinks.has(linkId) ? 2 : 1;
              }}
              linkDirectionalParticles={(link: GraphLink) => {
                // Add particles to highlighted links
                if (!selectedNode) return 0;
                
                // Safely handle source/target which might be string or object
                const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id || '';
                const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id || '';
                const linkId = `${sourceId}-${targetId}`;
                
                return highlightLinks.has(linkId) ? 4 : 0;
              }}
              linkDirectionalParticleSpeed={0.005}
              linkDirectionalParticleWidth={2}
              // Temporarily disable custom node objects to avoid Three.js issues
              // nodeThreeObject={(node: GraphNode) => {
              //   // Check if Three.js is available
              //   if (!(window as any).THREE) {
              //     console.warn('Three.js not available, using default node rendering');
              //     return null; // Let the library use default rendering
              //   }
              //   
              //   try {
              //     // Create Three.js objects for nodes
              //     const THREE = (window as any).THREE;
              //     const group = new THREE.Group();
              //     
              //     // Base color with some adjustments
              //     const color = NODE_COLOR[node.type];
              //     const size = node.val || 1;
              //     
              //     // Different geometries based on node type
              //     let geometry;
              //     if (node.type === 'core') {
              //       // Core node: Custom star-like shape
              //       geometry = new THREE.OctahedronGeometry(size, 1);
              //     } else if (node.type === 'controller') {
              //       // Controller: Dodecahedron (12-sided polyhedron)
              //       geometry = new THREE.DodecahedronGeometry(size, 0);
              //     } else if (node.type === 'trustRegistry') {
              //       // Trust Registry: Icosahedron (20-sided polyhedron)
              //       geometry = new THREE.IcosahedronGeometry(size, 0);
              //     } else if (node.type === 'didDirectory') {
              //       // DID Directory: Octahedron (8-sided polyhedron) 
              //       geometry = new THREE.OctahedronGeometry(size, 0);
              //     } else {
              //       // DIDs: Simple tetrahedron (4-sided polyhedron)
              //       geometry = new THREE.TetrahedronGeometry(size, 0);
              //     }
              //     
              //     // Create glow effect for nodes
              //     const material = new THREE.MeshStandardMaterial({
              //       color: color,
              //       emissive: color,
              //       emissiveIntensity: 0.4,
              //       transparent: true,
              //       opacity: 0.9,
              //       metalness: 0.3,
              //       roughness: 0.5
              //     });
              //     
              //     // Create the mesh and add to group
              //     const mesh = new THREE.Mesh(geometry, material);
              //     group.add(mesh);
              //     
              //     // Add halo/ring effect for selected node
              //     if (selectedNode && selectedNode.id === node.id) {
              //       // Outer glow ring
              //       const ringGeometry = new THREE.TorusGeometry(size * 1.5, size * 0.15, 10, 30);
              //       const ringMaterial = new THREE.MeshBasicMaterial({
              //         color: color,
              //         transparent: true,
              //         opacity: 0.6,
              //         side: THREE.DoubleSide
              //       });
              //       const ring = new THREE.Mesh(ringGeometry, ringMaterial);
              //       // Rotate ring to be perpendicular to camera
              //       ring.rotation.x = Math.PI / 2;
              //       group.add(ring);
              //       
              //       // Add pulsing light
              //       const light = new THREE.PointLight(color, 1, size * 15);
              //       light.position.set(0, 0, 0);
              //       group.add(light);
              //     }
              //     
              //     // For core and controller nodes, add text label that's always visible
              //     if (['core', 'controller'].includes(node.type)) {
              //       const textTexture = createTextTexture(node.label, color);
              //       if (textTexture) {
              //         const sprite = new THREE.Sprite(
              //           new THREE.SpriteMaterial({
              //             map: textTexture,
              //             transparent: true,
              //             opacity: 0.8
              //           })
              //         );
              //         sprite.position.set(0, -size * 2, 0);
              //         const scale = size * 5;
              //         sprite.scale.set(scale, scale / 4, 1);
              //         group.add(sprite);
              //       }
              //     }
              //     
              //     return group;
              //   } catch (error) {
              //     console.warn('Error creating custom node object:', error);
              //     return null; // Fall back to default rendering
              //   }
              // }}
              onNodeClick={onNodeClick}
              onBackgroundClick={() => {
                setSelectedNode(null);
                setHighlightLinks(new Set());
                // Stop animation
                if (pulseRef.current) clearInterval(pulseRef.current);
                setPulseAnimation(false);
              }}
              enablePointerInteraction={true}
              enableNodeDrag={true}
              controlType="orbit" 
              warmupTicks={60}
              cooldownTime={5000}
              // Performance optimizations
              d3AlphaDecay={0.02}         // Faster simulation stability
              d3VelocityDecay={0.4}       // Standard medium resistance
              d3AlphaMin={0.001}          // Helps reach stable state faster
              // Show labels with type information
              nodeLabel={(node: GraphNode) => {
                // Always show the full label with type information
                const typeLabel = node.type === 'controller' ? ' (Controller)' : 
                                 node.type === 'trustRegistry' ? ' (Trust Registry)' : 
                                 node.type === 'didDirectory' ? ' (DID Directory)' : 
                                 node.type === 'did' ? ' (DID)' : '';
                return `${node.label}${typeLabel}`;
              }}
              // Set distance view controls for better UX
              maxZoom={20}
              minZoom={0.5}
              // Enhance camera controls for better navigation
              cameraPosition={{ x: 0, y: 0, z: 200 }}
              onNodeDragEnd={(node: GraphNode) => {
                // When a node is dragged, update its position for the animation
                if (selectedNode && selectedNode.id === node.id) {
                  // Re-focus the camera on the new position
                  if (graphRef.current) {
        const distance = node.type === 'core' ? 100 : 
                                     node.type === 'controller' ? 50 : 30;
        
        const nodeX = node.x || 0;
        const nodeY = node.y || 0;
        const nodeZ = node.z || 0;
        
        graphRef.current.cameraPosition(
          { x: nodeX, y: nodeY, z: nodeZ + distance }, 
          { x: nodeX, y: nodeY, z: nodeZ }, 
          500
        );
                  }
                }
              }}
            />
          )}
          {loading && (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">Loading graph...</div>
          )}
        </div>
      </div>

      {!isFullscreen && (
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
                          <div className="flex justify-between text-gray-700 dark:text-gray-300"><span>Version</span><span className="font-mono text-gray-900 dark:text-white">{v.version}</span></div>
                          <div className="flex justify-between text-gray-700 dark:text-gray-300"><span>Created</span><span className="font-mono text-gray-900 dark:text-white">{formatDateTime(v.created)}</span></div>
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

            {selectedNode.type === 'controller' && (
              <div className="space-y-2">
                <InfoRow label="Address" value={selectedNode.label} mono />
                <p className="text-xs text-gray-500 dark:text-gray-400">Connected Trust Registries and DID Directory shown in graph.</p>
              </div>
            )}

            {selectedNode.type === 'didDirectory' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Contains all DIDs controlled by the controller.</p>
              </div>
            )}

            <div className="pt-2">
              <button
                className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                onClick={() => {
                  setSelectedNode(null);
                  setHighlightLinks(new Set());
                  // Stop animation
                  if (pulseRef.current) clearInterval(pulseRef.current);
                  setPulseAnimation(false);
                  // Return to overview
                  if (graphRef.current) {
                    graphRef.current.zoomToFit(1000);
                  }
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 text-gray-800 dark:text-gray-200">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Legend</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.core }} /> <span className="text-gray-800 dark:text-gray-200">Verana</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.controller }} /> <span className="text-gray-800 dark:text-gray-200">Controller</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.trustRegistry }} /> <span className="text-gray-800 dark:text-gray-200">Trust Registry</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.didDirectory }} /> <span className="text-gray-800 dark:text-gray-200">DID Directory</span></li>
            <li className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLOR.did }} /> <span className="text-gray-800 dark:text-gray-200">DID</span></li>
          </ul>
        </div>
        </div>
      )}
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
