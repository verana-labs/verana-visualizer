'use client'

import { useEffect, useRef, useState } from 'react'
import { type QueryInfo, toCurl } from '@/lib/api/query-info'
import { logger } from '@/lib/logger'

const COPIED_MS = 1600
const COPY_LABEL = { idle: 'Copy as curl', copied: 'Copied', failed: 'Copy failed' } as const

export function ShowQuery({ query }: { query: QueryInfo }) {
  const [open, setOpen] = useState(false)
  const [copy, setCopy] = useState<keyof typeof COPY_LABEL>('idle')
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const curl = toCurl(query)

  useEffect(() => () => clearTimeout(reset.current), [])

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curl)
      setCopy('copied')
    } catch (error) {
      logger.error('Could not copy the query to the clipboard', error)
      setCopy('failed')
    }
    clearTimeout(reset.current)
    reset.current = setTimeout(() => setCopy('idle'), COPIED_MS)
  }

  return (
    <section data-testid="show-query" className="mt-4 border-t border-scene-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer text-[10px] uppercase tracking-[.09em] text-scene-mut hover:text-white"
        >
          {open ? 'Hide the query' : 'Show the query'}
        </button>
        <span className="truncate font-mono text-[10.5px] text-scene-mut">
          {query.method} {new URL(query.url).pathname}
        </span>
      </div>
      <p className="mt-1 break-all font-mono text-[10.5px] text-scene-mut">{query.url}</p>
      {open && (
        <div className="mt-2 flex flex-col gap-2">
          <pre
            data-testid="curl"
            className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-[10px] border border-scene-line bg-black/30 p-2 font-mono text-[10.5px]"
          >
            {curl}
          </pre>
          <button
            type="button"
            onClick={copyCurl}
            className="cursor-pointer self-start rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] hover:border-[var(--accent)]"
          >
            {COPY_LABEL[copy]}
          </button>
        </div>
      )}
    </section>
  )
}
