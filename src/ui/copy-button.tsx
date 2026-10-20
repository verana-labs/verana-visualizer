'use client'

import { useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

const COPIED_MS = 1600

interface CopyButtonProps {
  label: string
  text: string | (() => string)
  className?: string
}

export function CopyButton({ label, text, className = '' }: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(reset.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? text() : text)
      setStatus('copied')
    } catch (error) {
      logger.error(`Could not copy "${label}" to the clipboard`, error)
      setStatus('failed')
    }
    clearTimeout(reset.current)
    reset.current = setTimeout(() => setStatus('idle'), COPIED_MS)
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={copy}
      className={`cursor-pointer rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] hover:border-[var(--accent)] ${className}`}
    >
      {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : label}
    </button>
  )
}
