import type { HTMLAttributes } from 'react'

export function GlassPanel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[14px] border border-scene-line bg-scene-glass backdrop-blur-[14px] backdrop-saturate-[140%] ${className}`}
      {...props}
    />
  )
}
