'use client'

import { useMemo } from 'react'
import { EXPIRY_WINDOW_DAYS } from '@/domain/expiry'
import { EXPIRING_COLOR, onboardingColor } from '@/features/registry/registry-data'
import { cachedRegistryBoard } from '@/layouts/registry'
import { useObservatory } from '@/store/observatory-store'
import { LABEL_CLASS } from './labels'
import { SceneHtml } from './scene-html'

const HEADER_RISE = 3

export function RegistryBoard() {
  const active = useObservatory((s) => s.lens === 'registry')
  const model = useObservatory((s) => s.model)
  const columns = useMemo(() => (model && active ? cachedRegistryBoard(model).columns : []), [model, active])

  return (
    <>
      {columns.map((column) => {
        const expiring = column.key === 'EXPIRING'
        return (
          <group key={column.key} position={[(column.left + column.right) / 2, column.top + HEADER_RISE, 0]}>
            <SceneHtml>
              <div
                className={`${LABEL_CLASS} border-b pb-0.5 text-center uppercase tracking-[.08em]`}
                style={{
                  color: expiring ? EXPIRING_COLOR : onboardingColor(column.key),
                  borderColor: 'currentColor',
                }}
              >
                {`${expiring ? `expiring ≤ ${EXPIRY_WINDOW_DAYS} days` : column.key} · ${column.count}`}
              </div>
            </SceneHtml>
          </group>
        )
      })}
    </>
  )
}
