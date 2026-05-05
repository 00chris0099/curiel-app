import { useEffect, useState } from 'react'

export const useOnlineStatus = () => {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine)
    const [isForcedOffline, setIsForcedOffline] = useState(false)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const effectiveOnline = isOnline && !isForcedOffline

    const toggleForcedOffline = () => {
        setIsForcedOffline((current) => !current)
    }

    const setForcedOffline = (value: boolean) => {
        setIsForcedOffline(value)
    }

    return {
        isOnline,
        isForcedOffline,
        effectiveOnline,
        toggleForcedOffline,
        setForcedOffline
    }
}
