'use client'

import { CopyButton } from '@/ui/copy-button'
import { PrintButton } from './print-button'

export function PageActions() {
  return (
    <>
      <CopyButton label="Copy verdict link" text={() => window.location.href} />
      <PrintButton />
    </>
  )
}
