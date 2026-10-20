import { serializeViewState, type ViewState } from '@/lib/view-state'

export const shareUrl = (origin: string, view: ViewState) => `${origin}/?${serializeViewState(view)}`
