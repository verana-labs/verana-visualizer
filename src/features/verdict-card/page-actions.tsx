'use client'

import { CopyButton } from '@/ui/copy-button'

export function PageActions({ path }: { path: string }) {
  return (
    <>
      <CopyButton label="Copy verdict link" text={() => `${window.location.origin}${path}`} />
      <button
        type="button"
        onClick={() => window.print()}
        className="cursor-pointer rounded-[10px] border border-scene-line px-2.5 py-1 text-[11px] hover:border-[var(--accent)]"
      >
        Print
      </button>
    </>
  )
}
