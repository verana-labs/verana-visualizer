const MAX_ACRONYM_LENGTH = 3

function hostOf(did: string): string {
  return did.split(':').pop() ?? did
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
  const firstLabel = hostOf(did).split('.')[0] ?? ''
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
