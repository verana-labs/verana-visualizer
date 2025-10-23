'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'

interface ForceGraph3DWrapperProps {
  [key: string]: any
}

const ForceGraph3DWrapper = forwardRef<any, ForceGraph3DWrapperProps>((props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useImperativeHandle(ref, () => graphRef.current, [])

  useEffect(() => {
    if (!containerRef.current) return

    // Wait for the library to load
    const initGraph = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Dynamic import with proper error handling
        const module = await import('3d-force-graph')
        const ForceGraph3D = module.default || module
        
        if (!graphRef.current && containerRef.current) {
          graphRef.current = new ForceGraph3D(containerRef.current)
          
          // Wait a bit for Three.js to be available
          setTimeout(() => {
            // Apply all props to the graph instance
            Object.keys(props).forEach(key => {
              if (key !== 'ref' && typeof graphRef.current[key] === 'function') {
                try {
                  graphRef.current[key](props[key])
                } catch (error) {
                  // Some props might not be valid methods, ignore silently
                  console.warn(`Failed to apply prop ${key}:`, error)
                }
              }
            })
            
            setIsLoading(false)
          }, 200) // Give Three.js time to load
        }
      } catch (error) {
        console.error('Failed to initialize ForceGraph3D:', error)
        setError('Failed to load 3D visualization')
        setIsLoading(false)
      }
    }

    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(initGraph, 100)

    return () => {
      clearTimeout(timer)
      if (graphRef.current && typeof graphRef.current._destructor === 'function') {
        graphRef.current._destructor()
      }
    }
  }, [])

  // Update graph when props change
  useEffect(() => {
    if (!graphRef.current) return

    Object.keys(props).forEach(key => {
      if (key !== 'ref' && typeof graphRef.current[key] === 'function') {
        try {
          graphRef.current[key](props[key])
        } catch (error) {
          // Some props might not be valid methods, ignore silently
        }
      }
    })
  }, [props])

  // Ensure the graph instance is properly exposed
  useEffect(() => {
    if (graphRef.current && ref) {
      // Make sure the ref is properly set
      if (typeof ref === 'function') {
        ref(graphRef.current)
      } else if (ref && 'current' in ref) {
        (ref as any).current = graphRef.current
      }
    }
  }, [graphRef.current, ref])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '14px'
        }}>
          Loading 3D visualization...
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ff6b6b',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
    </div>
  )
})

ForceGraph3DWrapper.displayName = 'ForceGraph3DWrapper'

export default ForceGraph3DWrapper
