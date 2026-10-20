'use client'

import { CopyButton } from '@/ui/copy-button'
import { PrintButton } from './print-button'

export function PageActions({ path }: { path: string }) {
  return (
    <>
      <CopyButton label="Copy verdict link" text={() => `${window.location.origin}${path}`} />
      <PrintButton />
    </>
  )
}
