import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import syncService from '../services/sync.service'
import { getApiErrorMessage } from '../api/axios'
import { getPendingQueueCount } from '../utils/offlineDb'
import { useOnlineStatus } from './useOnlineStatus'

export const useOfflineSync = (inspectionId?: string, onSynced?: () => Promise<void> | void) => {
  const isOnline = useOnlineStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingQueueCount(inspectionId)
    setPendingCount(count)
  }, [inspectionId])

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      return
    }

    setIsSyncing(true)
    try {
      const results = await syncService.syncPendingInspectionChanges(inspectionId)
      const failed = results.filter((item) => !item.success)

      if (failed.length > 0) {
        toast.error(`No se pudieron sincronizar ${failed.length} cambios`)
      } else if (results.length > 0) {
        toast.success('Cambios sincronizados')
      }

      await refreshPendingCount()
      await onSynced?.()
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al sincronizar cambios pendientes'))
    } finally {
      setIsSyncing(false)
    }
  }, [inspectionId, isOnline, onSynced, refreshPendingCount])

  useEffect(() => {
    refreshPendingCount()
  }, [refreshPendingCount])

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      void syncNow()
    }
  }, [isOnline])

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
    refreshPendingCount,
  }
}
