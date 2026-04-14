import { describe, it, expect } from 'vitest'
import { ok, err } from '../src/types/result.js'
import type { Result } from '../src/types/result.js'

describe('Result type', () => {
  describe('ok', () => {
    it('creates a success result with value', () => {
      const result: Result<number, string> = ok(42)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe(42)
      }
    })

    it('creates a success result with string value', () => {
      const result: Result<string, Error> = ok('hello')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value).toBe('hello')
      }
    })

    it('creates a success result with object value', () => {
      const result: Result<{ name: string }, never> = ok({ name: 'test' })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.name).toBe('test')
      }
    })

    it('result is frozen (immutable)', () => {
      const result = ok({ count: 1 })
      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('err', () => {
    it('creates an error result with error', () => {
      const result: Result<number, string> = err('something failed')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('something failed')
      }
    })

    it('creates an error result with object error', () => {
      const result: Result<never, { code: number; message: string }> = err({
        code: 404,
        message: 'not found',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.code).toBe(404)
        expect(result.error.message).toBe('not found')
      }
    })

    it('result is frozen (immutable)', () => {
      const result = err('fail')
      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('type narrowing', () => {
    it('narrows to Ok with ok === true check', () => {
      const result: Result<number, string> = ok(10)
      if (result.ok) {
        expect(typeof result.value).toBe('number')
      } else {
        expect.unreachable('should be ok')
      }
    })

    it('narrows to Err with ok === false check', () => {
      const result: Result<number, string> = err('fail')
      if (!result.ok) {
        expect(typeof result.error).toBe('string')
      } else {
        expect.unreachable('should be err')
      }
    })
  })
})

describe('public API exports', () => {
  it('exports Result types and constructors', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.ok).toBe('function')
    expect(typeof mod.err).toBe('function')
  })

  it('exports parser functions', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.parseSkillFile).toBe('function')
    expect(typeof mod.parseManifest).toBe('function')
  })

  it('exports pipeline stages', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.scan).toBe('function')
    expect(typeof mod.route).toBe('function')
    expect(typeof mod.load).toBe('function')
    expect(typeof mod.inject).toBe('function')
    expect(typeof mod.runPipeline).toBe('function')
  })
})
