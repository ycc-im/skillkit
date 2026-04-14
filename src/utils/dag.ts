export type DependencyGraph = ReadonlyMap<string, readonly string[]>

type VisitState = 'visiting' | 'visited'

export const detectCycle = (graph: DependencyGraph): string[] | null => {
  const visited = new Map<string, VisitState>()
  const path: string[] = []

  const dfs = (node: string): string[] | null => {
    const state = visited.get(node)
    if (state === 'visited') return null
    if (state === 'visiting') {
      const cycleStart = path.indexOf(node)
      return [...path.slice(cycleStart), node]
    }

    visited.set(node, 'visiting')
    path.push(node)

    const deps = graph.get(node)
    if (deps) {
      for (const dep of deps) {
        const cycle = dfs(dep)
        if (cycle) return cycle
      }
    }

    path.pop()
    visited.set(node, 'visited')
    return null
  }

  for (const node of graph.keys()) {
    const cycle = dfs(node)
    if (cycle) return cycle
  }

  return null
}
