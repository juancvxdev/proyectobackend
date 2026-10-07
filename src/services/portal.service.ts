import { assertCaseTransition } from '../domain/case-state.js'
import type { AuthUser } from '../domain/types.js'
import { PortalRepository } from '../repositories/portal.repository.js'

export class PortalService {
  constructor(private readonly repository: PortalRepository) {}

  me(user: AuthUser) {
    return user
  }

  catalogs() {
    return this.repository.catalogs()
  }

  cases(query: Record<string, any>) {
    return this.repository.cases(query)
  }

  caseById(id: string) {
    return this.repository.caseById(id)
  }

  createCase(form: Record<string, any>) {
    return this.repository.createCase(form)
  }

  async updateCase(id: string, form: Record<string, any>, user: AuthUser) {
    const current = await this.repository.caseById(id)
    assertCaseTransition(current.status, form.status)
    return this.repository.updateCase(id, form, user.id)
  }

  softDeleteCase(id: string, user: AuthUser) {
    return this.repository.softDeleteCase(id, user.id)
  }

  followUps(caseId: string) {
    return this.repository.followUps(caseId)
  }

  createFollowUp(caseId: string, form: Record<string, any>, user: AuthUser) {
    return this.repository.createFollowUp(caseId, form, user)
  }

  users() {
    return this.repository.users()
  }

  updateUser(id: string, user: Record<string, any>) {
    return this.repository.updateUser(id, user)
  }

  createArea(name: string) {
    return this.repository.createArea(name)
  }

  updateArea(id: string, values: Record<string, any>) {
    return this.repository.updateArea(id, values)
  }

  createCategory(caseType: string, name: string) {
    return this.repository.createCategory(caseType, name)
  }

  updateCategory(id: string, values: Record<string, any>) {
    return this.repository.updateCategory(id, values)
  }

  createReason(categoryId: string, name: string) {
    return this.repository.createReason(categoryId, name)
  }

  updateReason(id: string, values: Record<string, any>) {
    return this.repository.updateReason(id, values)
  }
}
