import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import notificationService from '../services/notification.service';
import type { Notification } from '../types';

const safeArray = <T,>(value: T[] | undefined | null) => Array.isArray(value) ? value : [];

export const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const loadNotifications = useCallback(async () => {
        setIsLoading(true);
        try {
            const [listResponse, count] = await Promise.all([
                notificationService.getNotifications(1, 5),
                notificationService.getUnreadCount()
            ]);

            setNotifications(safeArray(listResponse.data));
            setUnreadCount(count);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar las notificaciones'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadNotifications();
        const intervalId = window.setInterval(loadNotifications, 30000);
        return () => window.clearInterval(intervalId);
    }, [loadNotifications]);

    const latestNotifications = useMemo(() => safeArray(notifications), [notifications]);

    const handleToggle = async () => {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        if (nextOpen) {
            await loadNotifications();
        }
    };

    const handleMarkAsRead = async (notification: Notification) => {
        try {
            await notificationService.markAsRead(notification.id);
            setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item));
            setUnreadCount((current) => Math.max(0, current - (notification.readAt ? 0 : 1)));
            if (notification.inspectionId) {
                navigate(`/inspections/${notification.inspectionId}`);
                setIsOpen(false);
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la notificación'));
        }
    };

    const handleMarkAll = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'No se pudieron marcar las notificaciones'));
        }
    };

    return (
        <div className="relative">
            <button
                className="relative rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Notifications"
                onClick={handleToggle}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                            <div>
                                <h3 className="font-semibold">Notificaciones</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} sin leer</p>
                            </div>
                            <button type="button" onClick={handleMarkAll} className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                                Marcar todo
                            </button>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto">
                            {isLoading ? (
                                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">Cargando notificaciones...</div>
                            ) : latestNotifications.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No tienes notificaciones todavía.</div>
                            ) : latestNotifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleMarkAsRead(notification)}
                                    className={`w-full border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700/70 dark:hover:bg-gray-700/50 ${notification.readAt ? '' : 'bg-primary-50/50 dark:bg-primary-900/10'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{new Date(notification.createdAt).toLocaleString('es-PE')}</p>
                                        </div>
                                        {!notification.readAt && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-500" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/notifications');
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            >
                                <CheckCheck className="h-4 w-4" />
                                Ver todas
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
