import type { EntityId } from '@/domain/network-model'
import { formatSel } from './view-state'

const STATIC_ROUTES: Record<string, string> = {
  '/dashboard': '/?lens=chain',
  '/trust-registries': '/?lens=network',
  '/network-graph': '/',
  '/governance': '/?lens=governance',
  '/ecosystem': '/?lens=registry',
  '/developer-activity': '/',
}

const NUMERIC_KINDS = ['ecosystem', 'participant', 'corporation', 'schema', 'proposal']

function selUrl(id: string): string {
  return `/?sel=${formatSel(id as EntityId)}`
}

export function permalinkFor(kind: string, id: string): string {
  let decoded: string
  try {
    decoded = decodeURIComponent(id)
  } catch {
    return '/'
  }
  if (kind === 'did') return decoded.startsWith('did:') && decoded.length > 4 ? selUrl(`agent:${decoded}`) : '/'
  if (NUMERIC_KINDS.includes(kind) && /^\d+$/.test(decoded)) return selUrl(`${kind}:${decoded}`)
  return '/'
}

export function legacyRedirect(pathname: string, search: URLSearchParams): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  if (path === '/did-directory') {
    const did = search.get('did')
    if (did) return selUrl(`agent:${did}`)
    const controller = search.get('controller')
    return controller ? `/?q=${encodeURIComponent(controller)}` : '/'
  }
  if (path === '/permissions') {
    const permission = search.get('permission')
    return permission ? permalinkFor('participant', permission) : '/'
  }
  const governance = /^\/governance\/([^/]+)$/.exec(path)
  if (governance) {
    const target = permalinkFor('proposal', governance[1])
    return target === '/' ? '/?lens=governance' : `/?lens=governance&${target.slice(2)}`
  }
  return STATIC_ROUTES[path] ?? null
}
