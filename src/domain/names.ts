const MAX_ACRONYM_LENGTH = 3
const GENERIC_LABELS = new Set(['ecosystem', 'verana', 'www'])

function hostOf(did: string): string {
  const parts = did.split(':')
  const raw = (parts[1] === 'webvh' || parts[1] === 'webs' ? parts[3] : parts[2]) ?? did
  return raw.replace(/%3A\d*$/i, '')
}

function titleCase(words: string[]): string {
  return words
    .filter(Boolean)
    .map((word) =>
      word.length <= MAX_ACRONYM_LENGTH && /^[a-z]+$/i.test(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ')
}

function labelOf(did: string, stripSuffix: boolean): string {
  const labels = hostOf(did).split('.')
  const firstLabel = labels.find((label) => !GENERIC_LABELS.has(label.toLowerCase())) ?? labels[0] ?? ''
  const base = stripSuffix ? firstLabel.replace(/-(ecosystem|network)$/i, '') : firstLabel
  return titleCase(base.split('-')) || did
}

export function ecosystemName(did: string): string {
  return labelOf(did, true)
}

export function agentName(did: string): string {
  return labelOf(did, false)
}

export function schemaTitle(jsonSchema: string, id: number): string {
  const fallback = `Schema ${id}`
  try {
    const parsed: unknown = JSON.parse(jsonSchema)
    if (typeof parsed !== 'object' || parsed === null || !('title' in parsed)) return fallback
    return typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : fallback
  } catch {
    return fallback
  }
}
