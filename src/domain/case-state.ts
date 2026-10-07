import type { CaseStatus } from './types.js'

const transitions: Record<CaseStatus, CaseStatus[]> = {
  registered: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'closed', 'cancelled'],
  in_progress: ['waiting_customer', 'waiting_area', 'responded', 'solved', 'cancelled'],
  waiting_customer: ['in_progress', 'responded', 'cancelled'],
  waiting_area: ['in_progress', 'responded', 'cancelled'],
  responded: ['solved', 'closed', 'cancelled'],
  solved: ['closed'],
  closed: [],
  cancelled: [],
}

export function canTransition(from: CaseStatus, to: CaseStatus) {
  if (from === to) return true
  return transitions[from]?.includes(to) ?? false
}

export function assertCaseTransition(from: CaseStatus, to: CaseStatus) {
  if (!canTransition(from, to)) {
    const error = new Error(`Transicion de estado invalida: ${from} -> ${to}`)
    error.name = 'ConflictError'
    throw error
  }
}
