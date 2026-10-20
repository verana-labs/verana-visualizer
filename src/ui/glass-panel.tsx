import type { ComponentProps } from 'react'

export function GlassPanel({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={`rounded-[14px] border border-scene-line bg-scene-glass backdrop-blur-[14px] backdrop-saturate-[140%] ${className}`}
      {...props}
    />
  )
}
