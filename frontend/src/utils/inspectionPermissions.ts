import type { Inspection, InspectionStatus, User } from '../types'

const lockedInspectorExecutionStatuses: InspectionStatus[] = ['lista_revision', 'finalizada', 'cancelada']
const inspectorReportStatuses: InspectionStatus[] = ['lista_revision', 'finalizada']

export const isAdminOrArchitect = (user: User | null | undefined) => {
  return Boolean(user?.isMasterAdmin || user?.role === 'admin' || user?.role === 'arquitecto')
}

export const canCreateInspection = (user: User | null | undefined) => {
  return isAdminOrArchitect(user)
}

export const canManageUsers = (user: User | null | undefined) => {
  return Boolean(user?.isMasterAdmin || user?.role === 'admin')
}

export const isAssignedInspector = (inspection: Inspection | null | undefined, user: User | null | undefined) => {
  if (!inspection || !user) {
    return false
  }

  return user.role === 'inspector' && inspection.inspectorId === user.id
}

export const canAccessInspectionExecution = (inspection: Inspection | null | undefined, user: User | null | undefined) => {
  return isAdminOrArchitect(user) || isAssignedInspector(inspection, user)
}

export const canManageExecutionContent = (inspection: Inspection | null | undefined, user: User | null | undefined) => {
  if (!inspection || !user) {
    return false
  }

  if (isAdminOrArchitect(user)) {
    return true
  }

  return isAssignedInspector(inspection, user)
    && !lockedInspectorExecutionStatuses.includes(inspection.status)
}

export const canSendExecutionToReview = (inspection: Inspection | null | undefined, user: User | null | undefined) => {
  if (!inspection || !canAccessInspectionExecution(inspection, user)) {
    return false
  }

  return !['lista_revision', 'finalizada', 'cancelada'].includes(inspection.status)
}

export const canApproveInspectionReport = (user: User | null | undefined) => {
  return isAdminOrArchitect(user)
}

export const canGenerateInspectionReport = (inspection: Inspection | null | undefined, user: User | null | undefined) => {
  if (!inspection || !user) {
    return false
  }

  if (isAdminOrArchitect(user)) {
    return true
  }

  return isAssignedInspector(inspection, user)
    && inspectorReportStatuses.includes(inspection.status)
}
