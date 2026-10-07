import { describe, expect, it } from 'vitest'
import { assertCaseTransition, canTransition } from './case-state.js'

describe('case state machine', () => {
  it('allows valid transitions', () => {
    expect(canTransition('registered', 'assigned')).toBe(true)
    expect(canTransition('in_progress', 'responded')).toBe(true)
    expect(canTransition('solved', 'closed')).toBe(true)
  })

  it('rejects invalid transitions', () => {
    expect(canTransition('closed', 'in_progress')).toBe(false)
    expect(() => assertCaseTransition('registered', 'closed')).toThrow('Transicion de estado invalida')
  })
})
