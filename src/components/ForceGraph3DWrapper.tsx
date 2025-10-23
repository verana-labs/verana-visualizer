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
  const [retryCount, setRetryCount] = useState(0)

  useImperativeHandle(ref, () => graphRef.current, [])

  useEffect(() => {
    if (!containerRef.current) return

    // Wait for the library to load
    const initGraph = async () => {
      try {
        console.log('Initializing 3D graph...')
        setIsLoading(true)
        setError(null)
        
        // Check if we're in production and handle potential asset loading issues
        const isProduction = process.env.NODE_ENV === 'production'
        
        // Dynamic import with retry for production
        let importedModule
        let importAttempts = 0
        const maxImportAttempts = isProduction ? 3 : 1
        
        while (importAttempts < maxImportAttempts) {
          try {
            importedModule = await import('3d-force-graph')
            break
          } catch (importError) {
            importAttempts++
            console.warn(`Import attempt ${importAttempts} failed:`, importError)
            
            if (importAttempts >= maxImportAttempts) {
              throw importError
            }
            
            // Wait before retrying, longer delays for production
            const retryDelay = isProduction ? 2000 * importAttempts : 1000
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
        
        const ForceGraph3D = importedModule?.default || importedModule
        
        if (!ForceGraph3D) {
          throw new Error('Failed to load ForceGraph3D constructor')
        }
        
        if (!graphRef.current && containerRef.current) {
          // Check WebGL support in production
          if (isProduction) {
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
            if (!gl) {
              throw new Error('WebGL is not supported in this browser')
            }
          }
          
          console.log('Creating ForceGraph3D instance...')
          graphRef.current = new (ForceGraph3D as any)(containerRef.current)
          
          // Apply props immediately after creating the graph instance
          setTimeout(() => {
            try {
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
              
              console.log('3D graph initialized successfully')
              setIsLoading(false)
            } catch (error) {
              console.error('Error applying props to graph:', error)
              setError('Failed to initialize 3D visualization')
              setIsLoading(false)
            }
          }, isProduction ? 300 : 100) // Shorter delay
        }
      } catch (error) {
        console.error('Failed to initialize ForceGraph3D:', error)
        setError(`Failed to load 3D visualization: ${error instanceof Error ? error.message : String(error)}`)
        setIsLoading(false)
      }
    }

    // Add a delay to ensure DOM is ready, longer for production
    const delay = process.env.NODE_ENV === 'production' ? 300 : 100
    const timer = setTimeout(initGraph, delay)
    
    // Add timeout for production to prevent infinite loading
    const timeout = process.env.NODE_ENV === 'production' ? setTimeout(() => {
      if (isLoading) {
        console.error('3D graph initialization timeout')
        setError('Initialization timeout - please try refreshing the page')
        setIsLoading(false)
      }
    }, 30000) : null // 30 second timeout for production

    return () => {
      clearTimeout(timer)
      if (timeout) clearTimeout(timeout)
      if (graphRef.current && typeof graphRef.current._destructor === 'function') {
        graphRef.current._destructor()
      }
    }
  }, [retryCount])

  // Update graph when props change (only for data changes)
  useEffect(() => {
    if (!graphRef.current || !props.graphData) return

    try {
      graphRef.current.graphData(props.graphData)
    } catch (error) {
      console.warn('Failed to update graph data:', error)
    }
  }, [props.graphData])

  // Handle resize when width/height props change
  useEffect(() => {
    if (!graphRef.current || !props.width || !props.height) return

    // Add a small delay to ensure DOM has updated
    const resizeTimeout = setTimeout(() => {
      try {
        // Force the graph to resize its internal canvas
        graphRef.current.width(props.width)
        graphRef.current.height(props.height)
      } catch (error) {
        console.warn('Failed to resize graph:', error)
      }
    }, 50) // Small delay to ensure DOM updates are complete

    return () => clearTimeout(resizeTimeout)
  }, [props.width, props.height])

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
  }, [ref])

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
          textAlign: 'center',
          maxWidth: '300px',
          padding: '20px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
            Failed to load 3D visualization
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {error}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={() => {
                setError(null)
                setIsLoading(true)
                setRetryCount(prev => prev + 1)
                // Trigger a re-initialization by clearing the graph ref
                if (graphRef.current && typeof graphRef.current._destructor === 'function') {
                  graphRef.current._destructor()
                }
                graphRef.current = null
              }} 
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

ForceGraph3DWrapper.displayName = 'ForceGraph3DWrapper'

export default ForceGraph3DWrapper
