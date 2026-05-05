import { openDB, type DBSchema } from 'idb'
import type {
  InspectionExecutionData,
  UpdateInspectionExecutionSummaryDto,
  UpdateInspectionStatusDto,
  CreateInspectionAreaDto,
  UpdateInspectionAreaDto,
  CreateInspectionObservationDto,
  UpdateInspectionObservationDto,
  CreateInspectionPhotoDto,
  InspectionArea,
  InspectionObservation,
  InspectionPhoto,
} from '../types'

export type OfflineSyncStatus = 'pending' | 'synced' | 'failed'
export type OfflineEntityType = 'area' | 'observation' | 'photo' | 'summary' | 'status'
export type OfflineEntityAction = 'create' | 'update' | 'delete' | 'upsert'

export type ExecutionDraft = {
  inspectionId: string
  areaForm?: Record<string, unknown>
  manualAreaForm?: Record<string, unknown>
  observationForm?: Record<string, unknown>
  summaryForm?: Record<string, unknown>
  generalPhotoForm?: Record<string, unknown>
  areaPhotoForm?: Record<string, unknown>
  selectedAreaId?: string | null
  updatedAt: string
}

export type OfflineSyncItemPayload =
  | ({ entityType: 'area'; action: 'create'; data: CreateInspectionAreaDto; clientId: string })
  | ({ entityType: 'area'; action: 'update'; targetId: string; data: UpdateInspectionAreaDto })
  | ({ entityType: 'area'; action: 'delete'; targetId: string })
  | ({ entityType: 'observation'; action: 'create'; data: CreateInspectionObservationDto; clientId: string })
  | ({ entityType: 'observation'; action: 'update'; targetId: string; data: UpdateInspectionObservationDto })
  | ({ entityType: 'observation'; action: 'delete'; targetId: string })
  | ({ entityType: 'photo'; action: 'create'; data: CreateInspectionPhotoDto; clientId: string; file?: Blob | null; fileName?: string; fileType?: string; previewUrl?: string })
  | ({ entityType: 'summary'; action: 'upsert'; data: UpdateInspectionExecutionSummaryDto })
  | ({ entityType: 'status'; action: 'upsert'; data: UpdateInspectionStatusDto })

export type OfflineSyncItem = {
  id: string
  inspectionId: string
  syncStatus: OfflineSyncStatus
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
} & OfflineSyncItemPayload

type ExecutionSnapshot = {
  inspectionId: string
  data: InspectionExecutionData
  updatedAt: string
}

type LocalIdMapping = {
  localId: string
  serverId: string
  updatedAt: string
}

interface OfflineDbSchema extends DBSchema {
  executionSnapshots: {
    key: string
    value: ExecutionSnapshot
  }
  executionDrafts: {
    key: string
    value: ExecutionDraft
  }
  syncQueue: {
    key: string
    value: OfflineSyncItem
    indexes: {
      'by-inspection': string
      'by-status': OfflineSyncStatus
    }
  }
  localIdMappings: {
    key: string
    value: LocalIdMapping
  }
}

const DB_NAME = 'curiel-offline-db'
const DB_VERSION = 1

export const dbPromise = openDB<OfflineDbSchema>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('executionSnapshots')) {
      db.createObjectStore('executionSnapshots', { keyPath: 'inspectionId' })
    }

    if (!db.objectStoreNames.contains('executionDrafts')) {
      db.createObjectStore('executionDrafts', { keyPath: 'inspectionId' })
    }

    if (!db.objectStoreNames.contains('syncQueue')) {
      const store = db.createObjectStore('syncQueue', { keyPath: 'id' })
      store.createIndex('by-inspection', 'inspectionId')
      store.createIndex('by-status', 'syncStatus')
    }

    if (!db.objectStoreNames.contains('localIdMappings')) {
      db.createObjectStore('localIdMappings', { keyPath: 'localId' })
    }
  },
})

export const safeArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : []

export const createLocalId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const fileToDataUrl = async (file: Blob) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const saveExecutionSnapshot = async (inspectionId: string, data: InspectionExecutionData) => {
  const db = await dbPromise
  await db.put('executionSnapshots', {
    inspectionId,
    data,
    updatedAt: new Date().toISOString(),
  })
}

export const getExecutionSnapshot = async (inspectionId: string) => {
  const db = await dbPromise
  return db.get('executionSnapshots', inspectionId)
}

export const saveExecutionDraft = async (draft: ExecutionDraft) => {
  const db = await dbPromise
  await db.put('executionDrafts', draft)
}

export const getExecutionDraft = async (inspectionId: string) => {
  const db = await dbPromise
  return db.get('executionDrafts', inspectionId)
}

export const clearExecutionDraft = async (inspectionId: string) => {
  const db = await dbPromise
  await db.delete('executionDrafts', inspectionId)
}

export const addSyncQueueItem = async (item: ({ inspectionId: string } & OfflineSyncItemPayload) & { id?: string; syncStatus?: OfflineSyncStatus; errorMessage?: string | null }) => {
  const db = await dbPromise
  const now = new Date().toISOString()
  const queueItem: OfflineSyncItem = {
    ...item,
    id: item.id || createLocalId('queue'),
    syncStatus: item.syncStatus || 'pending',
    createdAt: now,
    updatedAt: now,
  } as OfflineSyncItem

  await db.put('syncQueue', queueItem)
  return queueItem
}

export const updateSyncQueueItem = async (id: string, patch: Partial<OfflineSyncItem>) => {
  const db = await dbPromise
  const current = await db.get('syncQueue', id)
  if (!current) return null
  const updated = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  await db.put('syncQueue', updated as OfflineSyncItem)
  return updated as OfflineSyncItem
}

export const removeSyncQueueItem = async (id: string) => {
  const db = await dbPromise
  await db.delete('syncQueue', id)
}

export const getInspectionQueueItems = async (inspectionId: string) => {
  const db = await dbPromise
  return db.getAllFromIndex('syncQueue', 'by-inspection', inspectionId)
}

export const getPendingQueueItems = async (inspectionId?: string) => {
  const db = await dbPromise
  const items = inspectionId
    ? await db.getAllFromIndex('syncQueue', 'by-inspection', inspectionId)
    : await db.getAll('syncQueue')

  return items
    .filter((item) => item.syncStatus === 'pending' || item.syncStatus === 'failed')
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
}

export const getPendingQueueCount = async (inspectionId?: string) => {
  const items = await getPendingQueueItems(inspectionId)
  return items.length
}

export const setLocalIdMapping = async (localId: string, serverId: string) => {
  const db = await dbPromise
  await db.put('localIdMappings', {
    localId,
    serverId,
    updatedAt: new Date().toISOString(),
  })
}

export const getServerIdForLocalId = async (localId: string) => {
  const db = await dbPromise
  const mapping = await db.get('localIdMappings', localId)
  return mapping?.serverId || null
}

export const mergeExecutionWithQueue = (base: InspectionExecutionData, queueItems: OfflineSyncItem[]): InspectionExecutionData => {
  const result: InspectionExecutionData = {
    inspection: base.inspection,
    areas: [...safeArray(base.areas)],
    observations: [...safeArray(base.observations)],
    photos: [...safeArray(base.photos)],
    summary: base.summary ? { ...base.summary } : null,
    stats: { ...base.stats },
  }

  for (const item of queueItems) {
    switch (item.entityType) {
      case 'area': {
        if (item.action === 'create') {
          const area: InspectionArea = {
            id: item.clientId,
            inspectionId: item.inspectionId,
            name: item.data.name,
            category: item.data.category,
            lengthM: item.data.lengthM ?? null,
            widthM: item.data.widthM ?? null,
            calculatedAreaM2: item.data.lengthM && item.data.widthM ? Number((item.data.lengthM * item.data.widthM).toFixed(2)) : null,
            ceilingHeightM: item.data.ceilingHeightM ?? null,
            notes: item.data.notes || null,
            status: item.data.status || 'pendiente',
            sortOrder: item.data.sortOrder || result.areas.length + 1,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }
          result.areas = [...result.areas.filter((existing) => existing.id !== area.id), area]
        }

        if (item.action === 'update') {
          result.areas = result.areas.map((area) => area.id === item.targetId ? {
            ...area,
            ...item.data,
            calculatedAreaM2: item.data.lengthM !== undefined || item.data.widthM !== undefined
              ? ((item.data.lengthM ?? area.lengthM) && (item.data.widthM ?? area.widthM)
                ? Number((((item.data.lengthM ?? area.lengthM) || 0) * (((item.data.widthM ?? area.widthM) || 0))).toFixed(2))
                : null)
              : area.calculatedAreaM2,
          } : area)
        }

        if (item.action === 'delete') {
          result.areas = result.areas.filter((area) => area.id !== item.targetId)
          result.observations = result.observations.filter((observation) => observation.areaId !== item.targetId)
          result.photos = result.photos.filter((photo) => photo.areaId !== item.targetId)
        }
        break
      }
      case 'observation': {
        if (item.action === 'create') {
          const observation: InspectionObservation = {
            id: item.clientId,
            inspectionId: item.inspectionId,
            areaId: item.data.areaId,
            title: item.data.title,
            description: item.data.description,
            severity: item.data.severity,
            type: item.data.type,
            recommendation: item.data.recommendation || null,
            metricValue: item.data.metricValue ?? null,
            metricUnit: item.data.metricUnit || null,
            status: item.data.status || 'pendiente',
            createdBy: 'offline',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }
          result.observations = [...result.observations.filter((existing) => existing.id !== observation.id), observation]
        }

        if (item.action === 'update') {
          result.observations = result.observations.map((observation) => observation.id === item.targetId ? { ...observation, ...item.data } : observation)
        }

        if (item.action === 'delete') {
          result.observations = result.observations.filter((observation) => observation.id !== item.targetId)
          result.photos = result.photos.filter((photo) => photo.observationId !== item.targetId)
        }
        break
      }
      case 'photo': {
        if (item.action === 'create') {
          const photo: InspectionPhoto = {
            id: item.clientId,
            inspectionId: item.inspectionId,
            areaId: item.data.areaId,
            observationId: item.data.observationId,
            type: item.data.type,
            url: item.previewUrl || item.data.url || '',
            caption: item.data.caption || null,
            uploadedById: 'offline',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }
          result.photos = [...result.photos.filter((existing) => existing.id !== photo.id), photo]
        }
        break
      }
      case 'summary': {
        if (item.action === 'upsert') {
          result.summary = {
            ...(result.summary || {
              id: 'offline-summary',
              inspectionId: item.inspectionId,
              totalAreaM2: 0,
              totalObservations: 0,
              criticalObservations: 0,
              highObservations: 0,
              mediumObservations: 0,
              lightObservations: 0,
              reportStatus: 'borrador',
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            }),
            ...item.data,
            updatedAt: item.updatedAt,
          }
        }
        break
      }
      case 'status': {
        if (item.action === 'upsert') {
          result.inspection = {
            ...result.inspection,
            status: item.data.status,
            scheduledDate: item.data.scheduledDate || result.inspection.scheduledDate,
          }
        }
        break
      }
    }
  }

  const totalAreaM2 = result.areas.reduce((sum, area) => sum + Number(area.calculatedAreaM2 || 0), 0)
  const totalObservations = result.observations.length
  const criticalObservations = result.observations.filter((item) => item.severity === 'critica').length
  const highObservations = result.observations.filter((item) => item.severity === 'alta').length
  const mediumObservations = result.observations.filter((item) => item.severity === 'media').length
  const lightObservations = result.observations.filter((item) => item.severity === 'leve').length

  result.stats = {
    totalAreaM2,
    areasRegistered: result.areas.length,
    totalObservations,
    criticalObservations,
    highObservations,
    mediumObservations,
    lightObservations,
    photosCount: result.photos.length,
    reportStatus: result.summary?.reportStatus || 'borrador',
  }

  if (result.summary) {
    result.summary = {
      ...result.summary,
      totalAreaM2,
      totalObservations,
      criticalObservations,
      highObservations,
      mediumObservations,
      lightObservations,
    }
  }

  return result
}
