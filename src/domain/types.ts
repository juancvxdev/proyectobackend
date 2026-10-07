export type CaseType = 'order_increase' | 'complaint' | 'requirement'
export type CaseStatus =
  | 'registered'
  | 'assigned'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_area'
  | 'responded'
  | 'solved'
  | 'closed'
  | 'cancelled'

export type UserRole = 'admin' | 'manager' | 'support' | 'customer'
export type CasePriority = 'low' | 'normal' | 'high' | 'critical'
export type FollowUpVisibility = 'internal' | 'customer'

export type AuthUser = {
  id: string
  email: string
  role: UserRole
  fullName: string
  active: boolean
  areaId?: string
  customerId?: string
}

export type RequestContext = {
  accessToken: string
  user: AuthUser
}
