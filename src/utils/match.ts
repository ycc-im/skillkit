export const matchKeywords = (
  query: string,
  keywords: readonly string[] | undefined,
): boolean => {
  if (!keywords || keywords.length === 0) return false
  return keywords.some((k) => query.includes(k))
}

export const matchPatterns = (
  query: string,
  patterns: readonly string[] | undefined,
): boolean => {
  if (!patterns || patterns.length === 0) return false
  return patterns.some((p) => {
    try {
      return new RegExp(p).test(query)
    } catch {
      return false
    }
  })
}

export const matchTags = (
  skillTags: readonly string[],
  queryTags: readonly string[],
): boolean => {
  if (skillTags.length === 0 || queryTags.length === 0) return false
  const querySet = new Set(queryTags)
  return skillTags.some((t) => querySet.has(t))
}
