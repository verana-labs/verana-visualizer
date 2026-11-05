import type { EntityId, EntityKind } from '@/domain/network-model'
import { LENSES } from '@/layouts'
import type { LensId } from '@/layouts/types'

export type Cam = [number, number, number, number, number, number]
export type Panel = 'inspector' | 'verdict'

export interface ViewState {
  lens: LensId
  sel: EntityId | null
  cam: Cam | null
  t: number | null
  panel: Panel | null
  tour: number | null
  q: string | null
}

const DEFAULT_LENS: LensId = 'network'
const MAX_QUERY = 256
const NUMERIC_KINDS: readonly EntityKind[] = ['ecosystem', 'participant', 'corporation', 'schema', 'proposal']

function parseSel(raw: string | null): EntityId | null {
  if (!raw) return null
  const i = raw.indexOf(':')
  if (i < 0) return null
  const kind = raw.slice(0, i)
  const rest = raw.slice(i + 1)
  if (kind === 'agent') return rest.startsWith('did:') && rest.length > 4 ? (raw as EntityId) : null
  if (NUMERIC_KINDS.includes(kind as EntityKind) && /^\d+$/.test(rest)) return raw as EntityId
  if (kind === 'proposal' && /^group-\d+$/.test(rest)) return raw as EntityId
  return null
}

function parseCam(raw: string | null): Cam | null {
  if (!raw) return null
  const parts = raw.split(',')
  if (parts.length !== 6) return null
  const nums = parts.map((p) => (p.trim() === '' ? Number.NaN : Number(p)))
  if (!nums.every(Number.isFinite)) return null
  return nums.map((n) => Math.round(n * 100) / 100) as Cam
}

export function formatSel(id: EntityId): string {
  const i = id.indexOf(':')
  return `${id.slice(0, i)}:${encodeURIComponent(id.slice(i + 1))}`
}

function parseQuery(raw: string | null): string | null {
  const q = raw?.trim() ?? ''
  return q && q.length <= MAX_QUERY ? q : null
}

export function parseViewState(search: URLSearchParams): ViewState {
  const lens = search.get('lens')
  const t = search.get('t')
  const panel = search.get('panel')
  const tour = search.get('tour')
  const tNum = t === null || t === '' ? Number.NaN : Number(t)
  const tourNum = tour === null || tour === '' ? Number.NaN : Number(tour)
  return {
    lens: LENSES.find((l) => l === lens) ?? DEFAULT_LENS,
    sel: parseSel(search.get('sel')),
    cam: parseCam(search.get('cam')),
    t: Number.isFinite(tNum) ? tNum : null,
    panel: panel === 'inspector' || panel === 'verdict' ? panel : null,
    tour: Number.isInteger(tourNum) && tourNum >= 0 ? tourNum : null,
    q: parseQuery(search.get('q')),
  }
}

export function serializeViewState(v: ViewState): string {
  const parts: string[] = []
  if (v.lens !== DEFAULT_LENS) parts.push(`lens=${v.lens}`)
  if (v.sel) parts.push(`sel=${formatSel(v.sel)}`)
  if (v.t !== null) parts.push(`t=${v.t}`)
  if (v.panel) parts.push(`panel=${v.panel}`)
  if (v.tour !== null) parts.push(`tour=${v.tour}`)
  if (v.q) parts.push(`q=${encodeURIComponent(v.q)}`)
  if (v.cam) parts.push(`cam=${v.cam.map((n) => Math.round(n * 100) / 100).join(',')}`)
  return parts.join('&')
}
