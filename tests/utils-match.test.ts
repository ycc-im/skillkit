import { describe, it, expect } from 'vitest'
import {
  matchKeywords,
  matchPatterns,
  matchTags,
} from '../src/utils/match.js'

describe('matchKeywords', () => {
  it('returns true when query contains a keyword', () => {
    expect(matchKeywords('run security scan', ['security'])).toBe(true)
  })

  it('returns false when no keyword matches', () => {
    expect(matchKeywords('hello world', ['security'])).toBe(false)
  })

  it('returns false for empty keywords array', () => {
    expect(matchKeywords('security', [])).toBe(false)
  })

  it('returns false for undefined keywords', () => {
    expect(matchKeywords('security', undefined)).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(matchKeywords('Security scan', ['security'])).toBe(false)
  })

  it('matches partial string inclusion', () => {
    expect(matchKeywords('insecurity', ['security'])).toBe(true)
  })

  it('returns true when any keyword matches', () => {
    expect(matchKeywords('deploy the app', ['security', 'deploy', 'test'])).toBe(true)
  })
})

describe('matchPatterns', () => {
  it('returns true when pattern matches query', () => {
    expect(matchPatterns('run detect-vulnerabilities', ['detect.*'])).toBe(true)
  })

  it('returns false when no pattern matches', () => {
    expect(matchPatterns('hello world', ['^security'])).toBe(false)
  })

  it('returns false for empty patterns array', () => {
    expect(matchPatterns('security', [])).toBe(false)
  })

  it('returns false for undefined patterns', () => {
    expect(matchPatterns('security', undefined)).toBe(false)
  })

  it('handles invalid regex gracefully returning false', () => {
    expect(matchPatterns('test', ['([unclosed'])).toBe(false)
  })

  it('returns true when any pattern matches', () => {
    expect(matchPatterns('run security', ['^hello', 'sec.*', '^test'])).toBe(true)
  })
})

describe('matchTags', () => {
  it('returns true when tags intersect', () => {
    expect(matchTags(['security', 'scan'], ['security'])).toBe(true)
  })

  it('returns false when no tags intersect', () => {
    expect(matchTags(['security'], ['deploy'])).toBe(false)
  })

  it('returns false for empty skill tags', () => {
    expect(matchTags([], ['security'])).toBe(false)
  })

  it('returns false for empty query tags', () => {
    expect(matchTags(['security'], [])).toBe(false)
  })

  it('returns false when both arrays are empty', () => {
    expect(matchTags([], [])).toBe(false)
  })

  it('matches multiple intersecting tags', () => {
    expect(matchTags(['security', 'scan', 'audit'], ['audit', 'deploy'])).toBe(true)
  })
})
