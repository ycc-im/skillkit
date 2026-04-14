import { describe, it, expect } from 'vitest'
import { detectCycle } from '../src/utils/dag.js'
import type { DependencyGraph } from '../src/utils/dag.js'

describe('detectCycle', () => {
  it('returns null for acyclic graph', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['B']],
      ['B', ['C']],
      ['C', []],
    ])
    expect(detectCycle(graph)).toBeNull()
  })

  it('returns null for empty graph', () => {
    const graph: DependencyGraph = new Map()
    expect(detectCycle(graph)).toBeNull()
  })

  it('detects direct cycle A->B->A', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['B']],
      ['B', ['A']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle!.length).toBeGreaterThanOrEqual(2)
  })

  it('detects indirect cycle A->B->C->A', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['A']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle!.length).toBeGreaterThanOrEqual(3)
  })

  it('detects self-cycle A->A', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['A']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
    expect(cycle).toContain('A')
  })

  it('returns null for disconnected acyclic graph', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['B']],
      ['B', []],
      ['C', ['D']],
      ['D', []],
    ])
    expect(detectCycle(graph)).toBeNull()
  })

  it('detects cycle in disconnected graph', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['B']],
      ['B', []],
      ['C', ['D']],
      ['D', ['C']],
    ])
    const cycle = detectCycle(graph)
    expect(cycle).not.toBeNull()
  })

  it('returns null for single node with no edges', () => {
    const graph: DependencyGraph = new Map([
      ['A', []],
    ])
    expect(detectCycle(graph)).toBeNull()
  })

  it('returns a valid cycle path for indirect cycle', () => {
    const graph: DependencyGraph = new Map([
      ['A', ['B']],
      ['B', ['C']],
      ['C', ['A']],
    ])
    const cycle = detectCycle(graph)!
    const firstIndex = cycle.indexOf('A')
    const lastItem = cycle[cycle.length - 1]
    expect(lastItem).toBe('A')
  })
})
