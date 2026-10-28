import type { HTMLAttributes } from 'react'

export function Chip({ className = '', ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`inline-block rounded-full px-[9px] py-[3px] text-[11px] font-medium ${className}`} {...props} />
  )
}
