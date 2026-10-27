import { parseViewState, serializeViewState, type ViewState } from '@/lib/view-state'

export function replaceViewState(patch: Partial<ViewState>) {
  const current = parseViewState(new URLSearchParams(window.location.search))
  const query = serializeViewState({ ...current, ...patch })
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
  if (url === `${window.location.pathname}${window.location.search}`) return
  window.history.replaceState(null, '', url)
}
