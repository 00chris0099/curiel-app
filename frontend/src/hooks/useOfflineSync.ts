import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import syncService from '../services/sync.service'
import { getApiErrorMessage } from '../api/axios'
import { getPendingQueueCount } from '../utils/offlineDb'
import { useOnlineStatus } from './useOnlineStatus'

export const useOfflineSync = (
    inspectionId?: string,
    onSynced?: () => Promise<void> | void
) => {
    const onlineStatus = useOnlineStatus()
    const [pendingCount, setPendingCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    const [lastSyncError, setLastSyncError] = useState<string | null>(null)

    const refreshPendingCount = useCallback(async () => {
        const count = await getPendingQueueCount(inspectionId)
        setPendingCount(count)
    }, [inspectionId])

    const syncNow = useCallback(async () => {
        if (!onlineStatus.effectiveOnline) {
            return
        }

        setIsSyncing(true)
        setLastSyncError(null)

        try {
            const results = await syncService.syncPendingInspectionChanges(
                inspectionId,
                onlineStatus.effectiveOnline
            )
            const failed = results.filter((item) => !item.success)

            if (failed.length > 0) {
                const message = `No se pudieron sincronizar ${failed.length} cambios`
                toast.error(message)
                setLastSyncError(message)
            } else if (results.length > 0) {
                toast.success('Cambios sincronizados')
            }

            await refreshPendingCount()
            await onSynced?.()
        } catch (error: unknown) {
            const message = getApiErrorMessage(error, 'Error al sincronizar cambios pendientes')
            toast.error(message)
            setLastSyncError(message)
        } finally {
            setIsSyncing(false)
        }
    }, [inspectionId, onlineStatus.effectiveOnline, onSynced, refreshPendingCount])

    useEffect(() => {
        refreshPendingCount()
    }, [refreshPendingCount])

    useEffect(() => {
        if (onlineStatus.effectiveOnline && pendingCount > 0) {
            void syncNow()
        }
    }, [onlineStatus.effectiveOnline, pendingCount])

    return {
        ...onlineStatus,
        pendingCount,
        isSyncing,
        lastSyncError,
        syncNow,
        refreshPendingCount,
    }
}

export type UseOfflineSyncReturn = ReturnType<typeof useOfflineSync>
