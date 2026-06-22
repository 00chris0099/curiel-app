import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../api/axios';
import notificationService from '../services/notification.service';
import type { Notification } from '../types';
import { CustomIcon } from './CustomIcon';

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
                notificationService.getUnreadCount(),
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
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la notificacion'));
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
                className="relative rounded-2xl border border-slate-200 bg-white p-2.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                aria-label="Notificaciones"
                onClick={handleToggle}
            >
                <CustomIcon name="bell" size="xs" tone="cream" variant="plain" />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-[#17324a] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />

                    {/* Mobile: full-screen modal. Desktop: dropdown */}
                    <div className="fixed inset-x-0 bottom-0 top-0 z-[70] flex flex-col bg-white dark:bg-slate-900 sm:static sm:inset-auto sm:bottom-auto sm:top-auto sm:z-20 sm:mt-3 sm:w-[min(380px,calc(100vw-2rem))] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-slate-200 sm:shadow-[0_24px_60px_rgba(23,50,74,0.16)] sm:dark:border-slate-700">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <CustomIcon name="bell" size="sm" tone="cream" variant="plain" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">Notificaciones</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{unreadCount} sin leer</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={handleMarkAll} className="text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                                    Marcar todo
                                </button>
                                <button type="button" onClick={() => setIsOpen(false)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 sm:hidden dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    Cerrar
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[#fbfbfa] dark:bg-slate-800 sm:max-h-[420px]">
                            {isLoading ? (
                                <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">Cargando notificaciones...</div>
                            ) : latestNotifications.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                    <div className="mb-3 flex justify-center">
                                        <CustomIcon name="bell" size="md" tone="mist" variant="plain" />
                                    </div>
                                    No tienes notificaciones todavias.
                                </div>
                            ) : latestNotifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    type="button"
                                    onClick={() => handleMarkAsRead(notification)}
                                    className={`w-full border-b border-slate-200 px-5 py-4 text-left transition-colors hover:bg-white dark:border-slate-700 dark:hover:bg-slate-700 ${notification.readAt ? 'bg-transparent' : 'bg-[#f5efe1]/70 dark:bg-amber-900/20'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <CustomIcon name={notification.readAt ? 'clipboard-check' : 'bell'} size="sm" tone={notification.readAt ? 'white' : 'cream'} variant="plain" />
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-slate-100">{notification.title}</p>
                                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{notification.message}</p>
                                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">{new Date(notification.createdAt).toLocaleString('es-PE')}</p>
                                            </div>
                                        </div>
                                        {!notification.readAt && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#17324a]" />}
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => {
                                    navigate('/notifications');
                                    setIsOpen(false);
                                }}
                                className="flex items-center gap-3 text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                            >
                                <CustomIcon name="check-circle" size="xs" tone="sage" variant="plain" />
                                Ver todas
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
