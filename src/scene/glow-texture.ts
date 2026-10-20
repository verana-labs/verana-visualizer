import { useEffect, useMemo } from 'react'
import { CanvasTexture } from 'three'

const SIZE = 128

function createGlowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Cannot draw the glow texture: 2D canvas context unavailable')
  const half = SIZE / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.2, 'rgba(200,180,255,.55)')
  gradient.addColorStop(0.5, 'rgba(140,100,255,.12)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SIZE, SIZE)
  return new CanvasTexture(canvas)
}

export function useGlowTexture(): CanvasTexture {
  const texture = useMemo(createGlowTexture, [])
  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
