import inspectionService from './inspection.service'
import {
  getPendingQueueItems,
  getServerIdForLocalId,
  removeSyncQueueItem,
  setLocalIdMapping,
  updateSyncQueueItem,
  type OfflineSyncItem,
} from '../utils/offlineDb'

const resolveId = async (value?: string) => {
  if (!value) return value
  if (!value.startsWith('local-')) return value
  return (await getServerIdForLocalId(value)) || value
}

const toFile = (blob: Blob, name?: string, type?: string) => {
  return new File([blob], name || 'offline-photo.jpg', { type: type || blob.type || 'image/jpeg' })
}

const syncQueueItem = async (item: OfflineSyncItem) => {
  await updateSyncQueueItem(item.id, { syncStatus: 'pending', errorMessage: null })

  switch (item.entityType) {
    case 'area': {
      if (item.action === 'create') {
        const response = await inspectionService.createExecutionArea(item.inspectionId, item.data)
        await setLocalIdMapping(item.clientId, response.area.id)
      }

      if (item.action === 'update') {
        const targetId = await resolveId(item.targetId)
        if (!targetId || targetId.startsWith('local-')) {
          throw new Error('No se pudo resolver el área local para sincronizar')
        }
        await inspectionService.updateExecutionArea(item.inspectionId, targetId, item.data)
      }

      if (item.action === 'delete') {
        const targetId = await resolveId(item.targetId)
        if (!targetId || targetId.startsWith('local-')) {
          await removeSyncQueueItem(item.id)
          return
        }
        await inspectionService.deleteExecutionArea(item.inspectionId, targetId)
      }
      break
    }
    case 'observation': {
      if (item.action === 'create') {
        const areaId = await resolveId(item.data.areaId)
        if (!areaId || areaId.startsWith('local-')) {
          throw new Error('El área asociada todavía no se sincroniza')
        }
        const response = await inspectionService.createExecutionObservation(item.inspectionId, {
          ...item.data,
          areaId,
        })
        await setLocalIdMapping(item.clientId, response.observation.id)
      }

      if (item.action === 'update') {
        const targetId = await resolveId(item.targetId)
        if (!targetId || targetId.startsWith('local-')) {
          throw new Error('No se pudo resolver la observación local para sincronizar')
        }
        const nextAreaId = item.data.areaId ? await resolveId(item.data.areaId) : undefined
        await inspectionService.updateExecutionObservation(item.inspectionId, targetId, {
          ...item.data,
          areaId: nextAreaId,
        })
      }

      if (item.action === 'delete') {
        const targetId = await resolveId(item.targetId)
        if (!targetId || targetId.startsWith('local-')) {
          await removeSyncQueueItem(item.id)
          return
        }
        await inspectionService.deleteExecutionObservation(item.inspectionId, targetId)
      }
      break
    }
    case 'photo': {
      if (item.action === 'create') {
        const areaId = item.data.areaId ? await resolveId(item.data.areaId) : undefined
        const observationId = item.data.observationId ? await resolveId(item.data.observationId) : undefined
        const file = item.file ? toFile(item.file, item.fileName, item.fileType) : undefined
        const response = await inspectionService.createExecutionPhoto(item.inspectionId, {
          ...item.data,
          areaId,
          observationId,
        }, file)
        await setLocalIdMapping(item.clientId, response.photo.id)
      }
      break
    }
    case 'summary': {
      await inspectionService.updateExecutionSummary(item.inspectionId, item.data)
      break
    }
    case 'status': {
      await inspectionService.updateStatus(item.inspectionId, item.data)
      break
    }
  }

  await updateSyncQueueItem(item.id, { syncStatus: 'synced', errorMessage: null })
  await removeSyncQueueItem(item.id)
}

const syncPendingInspectionChanges = async (
    inspectionId?: string,
    forceSync = true
) => {
    if (!forceSync) {
        return []
    }

    const queue = await getPendingQueueItems(inspectionId)
    const order = ['area', 'observation', 'photo', 'summary', 'status']
    const sortedQueue = [...queue].sort((left, right) => {
        const typeDiff = order.indexOf(left.entityType) - order.indexOf(right.entityType)
        if (typeDiff !== 0) return typeDiff
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    })

    const results: Array<{ id: string; success: boolean; message?: string }> = []

    for (const item of sortedQueue) {
        try {
            await syncQueueItem(item)
            results.push({ id: item.id, success: true })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error al sincronizar'
            await updateSyncQueueItem(item.id, { syncStatus: 'failed', errorMessage: message })
            results.push({ id: item.id, success: false, message })
        }
    }

    return results
}

export default {
  syncPendingInspectionChanges,
}
